from torch import cuda
from fastembed import TextEmbedding


selected_embedding_model = "intfloat/multilingual-e5-large"

supported_model_json = TextEmbedding.list_supported_models()
supported_model_list = [entry['model'] for entry in supported_model_json]

if selected_embedding_model in supported_model_list:
    # Use Fastembed if model is supported GPU + CPU
    print("Using Fastembed")
    provider = "CUDAExecutionProvider" if cuda.is_available() else "CPUExecutionProvider"
    embedding_model = TextEmbedding(
        providers=[provider],
        model_name=selected_embedding_model, 
    )

    class LocalEmbeddingFunction:
        def __init__(self, model):
            self.model = model

        def __call__(self, document):
            # Get embeddings of a document
            embeddings_generator = embedding_model.embed(document)
            embeddings_list = list(embeddings_generator)

            return embeddings_list
        
        def get_embedding_dimension(self):
            # Get the embedding dimension
            return embedding_model.get_embedding_dimension()

else:
    # Use Sentence Transformers if model is not supported by Fastembed
    print("Using Sentence Transformers")
    from sentence_transformers import SentenceTransformer
    
    embedding_model = SentenceTransformer(
        model_name_or_path=selected_embedding_model,
        device="cuda" if cuda.is_available() else "cpu",
    )

    class LocalEmbeddingFunction:
        def __init__(self, model: None):
            self.model = model if model else embedding_model

        def __call__(self, documents):
            # Get embeddings of a list of documents
            embeddings = self.model.encode(documents, normalize_embeddings=True)

            return embeddings
        

        def get_embedding_dimension(self):
            # Get the embedding dimension
            return self.model.get_sentence_embedding_dimension()

