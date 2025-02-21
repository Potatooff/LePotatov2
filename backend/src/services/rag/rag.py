from src.services.rag.chunking import cluster_semantic_chunker
from src.services.rag.embeddings import LocalEmbeddingFunction, embedding_model
from src.services.rag.vector_db import MilvusVectorDB


docs = ["""For an AI model to be useful in specific contexts, it often needs access to background knowledge. For example, customer support chatbots need knowledge about the specific business they're being used for, and legal analyst bots need to know about a vast array of past cases.

Developers typically enhance an AI model's knowledge using Retrieval-Augmented Generation (RAG). RAG is a method that retrieves relevant information from a knowledge base and appends it to the user's prompt, significantly enhancing the model's response. The problem is that traditional RAG solutions remove context when encoding information, which often results in the system failing to retrieve the relevant information from the knowledge base.

In this post, we outline a method that dramatically improves the retrieval step in RAG. The method is called “Contextual Retrieval” and uses two sub-techniques: Contextual Embeddings and Contextual BM25. This method can reduce the number of failed retrievals by 49% and, when combined with reranking, by 67%. These represent significant improvements in retrieval accuracy, which directly translates to better performance in downstream tasks.

You can easily deploy your own Contextual Retrieval solution with Claude with our cookbook.

A note on simply using a longer prompt
Sometimes the simplest solution is the best. If your knowledge base is smaller than 200,000 tokens (about 500 pages of material), you can just include the entire knowledge base in the prompt that you give the model, with no need for RAG or similar methods.

A few weeks ago, we released prompt caching for Claude, which makes this approach significantly faster and more cost-effective. Developers can now cache frequently used prompts between API calls, reducing latency by > 2x and costs by up to 90% (you can see how it works by reading our prompt caching cookbook).

However, as your knowledge base grows, you'll need a more scalable solution. That’s where Contextual Retrieval comes in.

A primer on RAG: scaling to larger knowledge bases
For larger knowledge bases that don't fit within the context window, RAG is the typical solution. RAG works by preprocessing a knowledge base using the following steps:

Break down the knowledge base (the “corpus” of documents) into smaller chunks of text, usually no more than a few hundred tokens;
Use an embedding model to convert these chunks into vector embeddings that encode meaning;
Store these embeddings in a vector database that allows for searching by semantic similarity.
At runtime, when a user inputs a query to the model, the vector database is used to find the most relevant chunks based on semantic similarity to the query. Then, the most relevant chunks are added to the prompt sent to the generative model.

While embedding models excel at capturing semantic relationships, they can miss crucial exact matches. Fortunately, there’s an older technique that can assist in these situations. BM25 (Best Matching 25) is a ranking function that uses lexical matching to find precise word or phrase matches. It's particularly effective for queries that include unique identifiers or technical terms.

BM25 works by building upon the TF-IDF (Term Frequency-Inverse Document Frequency) concept. TF-IDF measures how important a word is to a document in a collection. BM25 refines this by considering document length and applying a saturation function to term frequency, which helps prevent common words from dominating the results.

Here’s how BM25 can succeed where semantic embeddings fail: Suppose a user queries "Error code TS-999" in a technical support database. An embedding model might find content about error codes in general, but could miss the exact "TS-999" match. BM25 looks for this specific text string to identify the relevant documentation.

RAG solutions can more accurately retrieve the most applicable chunks by combining the embeddings and BM25 techniques using the following steps:

Break down the knowledge base (the "corpus" of documents) into smaller chunks of text, usually no more than a few hundred tokens;
Create TF-IDF encodings and semantic embeddings for these chunks;
Use BM25 to find top chunks based on exact matches;
Use embeddings to find top chunks based on semantic similarity;
Combine and deduplicate results from (3) and (4) using rank fusion techniques;
Add the top-K chunks to the prompt to generate the response.
By leveraging both BM25 and embedding models, traditional RAG systems can provide more comprehensive and accurate results, balancing precise term matching with broader semantic understanding.

"""]

chunker = cluster_semantic_chunker.ClusterSemanticChunker()

# Split the text into chunks
chunked_docs = []
for document in docs:
    chunked_docs.append(
        chunker.split_text(document)
    )
# Example output
# ['...', '...', '...']

# Embed the chunks
for chunk in chunked_docs:
    ... #embeddings = LocalEmbeddingFunction(embedding_model)(chunk)
    # Example output
    # [[...], [...], [...]]

current_db = MilvusVectorDB("user")
res = current_db.create_collection("hi")
print(res) # <--- Not working... need docker with milvusgi 