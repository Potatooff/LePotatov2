from pymilvus import MilvusClient
from src.services.rag.embeddings import LocalEmbeddingFunction, embedding_model



class MilvusVectorDB:

    def __init__(self, client):
        self.client = MilvusClient(f"{client}.db")


    def create_collection(self, collection_name):
        new_collection = self.client.create_collection(
            collection_name=collection_name,
            dimension=LocalEmbeddingFunction(embedding_model).get_embedding_dimension() 
        )

        return new_collection


