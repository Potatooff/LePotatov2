from typing import List, Optional, Tuple
import numpy as np
import logging
import tiktoken
from dataclasses import dataclass
from src.services.rag.chunking.recursive_token_chunker import RecursiveTokenChunker, Language
from src.services.rag.embeddings import LocalEmbeddingFunction, embedding_model

logger = logging.getLogger(__name__)

# Utils 
def openai_token_count(string: str) -> int:
    """Returns the number of tokens in a text string."""
    encoding = tiktoken.get_encoding("cl100k_base")
    num_tokens = len(encoding.encode(string, disallowed_special=()))
    return num_tokens

@dataclass
class ChunkerConfig:
    """Configuration for ClusterSemanticChunker with reasonable defaults."""
    max_chunk_size: int = 200
    min_chunk_size: int = 50
    batch_size: int = 25
    window_size_multiplier: float = 3.0
    similarity_threshold: float = 0.25
    normalization_epsilon: float = 1e-6
    size_penalty_exponent: float = 0.33
    max_retries: int = 3
    retry_delay: float = 1.0  # seconds
    min_window_size: int = 100

    def __post_init__(self):
        """Validate configuration parameters."""
        if self.max_chunk_size <= self.min_chunk_size:
            raise ValueError("max_chunk_size must be greater than min_chunk_size")
        if self.batch_size <= 0:
            raise ValueError("batch_size must be positive")
        if not 0 < self.similarity_threshold < 1:
            raise ValueError("similarity_threshold must be between 0 and 1")
        if self.normalization_epsilon <= 0:
            raise ValueError("normalization_epsilon must be positive")
        if not 0 < self.size_penalty_exponent <= 1:
            raise ValueError("size_penalty_exponent must be between 0 and 1")

class ClusterSemanticChunker:
    """
    Enhanced implementation of semantic text chunking using clustering.
    Includes batched processing, dynamic window sizing, and robust error handling.
    """
    
    def __init__(
        self,
        embedding_function=None,
        config: Optional[ChunkerConfig] = None,
        length_function=openai_token_count,
        language: Optional[Language] = None,
    ):
        """
        Initialize the chunker with given configuration.
        
        Args:
            embedding_function: Function to generate embeddings for text
            config: ChunkerConfig instance with chunking parameters
            length_function: Function to calculate text length
            language: Optional language for specialized splitting
        """
        self.config = config or ChunkerConfig()
        self.embedding_function = embedding_function or LocalEmbeddingFunction(embedding_model)
        self.length_function = length_function

        # Initialize the recursive chunker with language-specific separators
        separators = None
        if language is not None:
            try:
                separators = RecursiveTokenChunker.get_separators_for_language(language)
            except ValueError as e:
                logger.warning(f"Language {language} not supported, using default separators: {e}")
        
        self.splitter = RecursiveTokenChunker(
            chunk_size=self.config.min_chunk_size,
            chunk_overlap=20,
            length_function=length_function,
            separators=separators or ["\n\n", "\n", ".", "?", "!", " ", ""]
        )

    def _get_embeddings_batched(self, sentences: List[str]) -> np.ndarray:
        """Get embeddings in batches with retry logic."""
        embeddings = []
        for i in range(0, len(sentences), self.config.batch_size):
            batch = sentences[i:i + self.config.batch_size]
            
            for attempt in range(self.config.max_retries):
                try:
                    batch_embeddings = self.embedding_function(batch)
                    embeddings.extend(batch_embeddings)
                    break
                except Exception as e:
                    if attempt == self.config.max_retries - 1:
                        logger.error(f"Batch {i//self.config.batch_size} failed after {self.config.max_retries} attempts: {e}")
                        raise
                    logger.warning(f"Batch {i//self.config.batch_size} attempt {attempt + 1} failed, retrying...")
                    import time
                    time.sleep(self.config.retry_delay)
                    
        return np.array(embeddings)

    def _get_similarity_matrix(self, sentences: List[str], doc_length: int) -> np.ndarray:
        """Compute normalized cosine similarity matrix with dynamic windowing."""
        # Calculate dynamic window size based on document length
        window_size = min(
            int(self.config.min_chunk_size * self.config.window_size_multiplier),
            max(self.config.min_window_size, int(doc_length * 0.1))
        )
        
        # Get embeddings with batching and retries
        embedding_matrix = self._get_embeddings_batched(sentences)
        
        # Normalize embeddings
        norms = np.linalg.norm(embedding_matrix, axis=1, keepdims=True)
        normalized_embeddings = embedding_matrix / np.where(
            norms < self.config.normalization_epsilon,
            self.config.normalization_epsilon,
            norms
        )
        
        # Initialize similarity matrix
        n = len(sentences)
        similarity_matrix = np.zeros((n, n))
        
        # Compute similarities within window range
        for i in range(n):
            start = max(0, i - window_size)
            end = min(n, i + window_size + 1)
            similarities = np.dot(normalized_embeddings[i], normalized_embeddings[start:end].T)
            similarity_matrix[i, start:end] = similarities
            similarity_matrix[start:end, i] = similarities
        
        return similarity_matrix

    def _calculate_cluster_score(self, matrix: np.ndarray, start: int, end: int) -> float:
        """Calculate normalized cluster score with configurable size penalty."""
        size = end - start + 1
        if size == 0:
            return 0.0
        
        sub_matrix = matrix[start:end+1, start:end+1]
        raw_score = np.sum(sub_matrix)
        size_penalty = np.power(size, self.config.size_penalty_exponent)
        
        print(f"raw_score: {raw_score / size_penalty}")
        return raw_score / size_penalty

    def _optimal_segmentation(self, matrix: np.ndarray) -> List[Tuple[int, int]]:
        """Find optimal segmentation using dynamic programming."""
        n = matrix.shape[0]
        max_cluster_size = self.config.max_chunk_size // self.config.min_chunk_size
        
        dp = np.full(n + 1, -np.inf)
        dp[0] = 0.0
        backpointers = np.zeros(n, dtype=int)
        
        # Forward pass
        for i in range(n):
            for j in range(max(0, i - max_cluster_size), i + 1):
                score = dp[j] + self._calculate_cluster_score(matrix, j, i)
                if score > dp[i + 1]:
                    dp[i + 1] = score
                    backpointers[i] = j
        
        # Backward pass to reconstruct clusters
        clusters = []
        i = n - 1
        while i >= 0:
            start = backpointers[i]
            clusters.append((start, i))
            i = start - 1
        
        return list(reversed(clusters))

    def _merge_adjacent_clusters(
        self,
        clusters: List[Tuple[int, int]],
        similarity_matrix: np.ndarray
    ) -> List[Tuple[int, int]]:
        """Merge adjacent clusters that exceed similarity threshold."""
        if not clusters:
            return []

        merged = [clusters[0]]
        for current in clusters[1:]:
            last = merged[-1]
            
            # Calculate average similarity between clusters
            connection_strength = np.mean(
                similarity_matrix[last[1]-1:last[1]+1, current[0]:current[0]+2]
            )
            
            # Merge if connection is strong enough and resulting size is valid
            if (connection_strength > self.config.similarity_threshold and 
                self.length_function(' '.join(self._current_sentences[last[0]:current[1]+1])) 
                <= self.config.max_chunk_size):
                merged[-1] = (last[0], current[1])
            else:
                merged.append(current)
        
        return merged

    def _validate_chunk_size(self, chunks: List[str]) -> List[str]:
        """Ensure chunks don't exceed maximum size with fallback splitting."""
        valid_chunks = []
        for chunk in chunks:
            chunk_size = self.length_function(chunk)
            if chunk_size <= self.config.max_chunk_size:
                valid_chunks.append(chunk)
            else:
                logger.warning(
                    f"Chunk exceeded max size ({chunk_size} tokens), "
                    "applying fallback splitting"
                )
                valid_chunks.extend(self.splitter.split_text(chunk))
        
        return [chunk for chunk in valid_chunks if chunk.strip()]

    def split_text(self, text: str) -> List[str]:
        """
        Split text into semantically meaningful chunks.
        
        Args:
            text: Input text to be split
            
        Returns:
            List of text chunks
        """
        # Initial validation
        if not text or not text.strip():
            return []
        
        # Short-circuit for small texts
        if self.length_function(text) <= self.config.max_chunk_size:
            return [text]

        try:
            # First-stage syntactic chunking
            self._current_sentences = self.splitter.split_text(text)
            if not self._current_sentences:
                return []

            # Compute similarity matrix with dynamic windowing
            similarity_matrix = self._get_similarity_matrix(
                self._current_sentences,
                len(self._current_sentences)
            )

            # Find optimal segmentation
            clusters = self._optimal_segmentation(similarity_matrix)
            
            # Merge adjacent clusters
            merged_clusters = self._merge_adjacent_clusters(clusters, similarity_matrix)
            
            # Generate and validate chunks
            chunks = [
                ' '.join(self._current_sentences[start:end+1]) 
                for start, end in merged_clusters
            ]
            validated_chunks = self._validate_chunk_size(chunks)

        except Exception as e:
            logger.error(f"Semantic chunking failed: {e}")
            logger.info("Falling back to basic syntactic chunking")
            return self.splitter.split_text(text)
        
        finally:
            # Clean up
            self._current_sentences = None

        return validated_chunks