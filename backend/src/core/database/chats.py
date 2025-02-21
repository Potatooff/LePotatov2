from src.core.database.constants import databases
from appwrite.id import ID
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.query import Query
from datetime import datetime
import json

class AppwriteChatDatabase:
    database_id = None
    collection_id = None
    
    @classmethod
    def initialize(cls, db_id, coll_id):
        cls.database_id = db_id
        cls.collection_id = coll_id

def p(info):
    print("\033[32;1m" + str(info) + "\033[0m")

def CreateChatHistoryDatabase():
    p("Running Create Chat History Database")
    try:
        dbs = databases.list()
        for db in dbs["databases"]:
            if (db["name"] == "ChatHistory"):
                return db
                
        response = databases.create(
            database_id=ID.unique(),
            name="ChatHistory",
        )
        return response
    except Exception as e:
        print(f"Error creating database: {str(e)}")
        raise e

def CreateChatHistoryCollection(database_id):
    print("Creating 'chats' collection...")
    try:
        collections = databases.list_collections(database_id)
        for coll in collections["collections"]:
            if coll["name"] == "ChatHistoryCollection":
                # Create missing attributes if needed
                try:
                    _create_collection_attributes(database_id, coll["$id"])
                except Exception as e:
                    print(f"Warning: Attribute creation error: {e}")
                return coll
                
        response = databases.create_collection(
            database_id=database_id,
            collection_id=ID.unique(),
            name="ChatHistoryCollection",
            permissions=[
                Permission.read(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ]
        )
        
        _create_collection_attributes(database_id, response["$id"])
        return response
    except Exception as e:
        print(f"Error creating collection: {str(e)}")
        raise e

def _create_collection_attributes(database_id, collection_id):
    def create_attr(key, type_str, size=None, required=True):
        try:
            if type_str == "string":
                databases.create_string_attribute(
                    database_id, collection_id, key, 
                    size=size or 255, required=required
                )
                print(f"Created attribute: {key}")
            elif type_str == "integer":
                databases.create_integer_attribute(
                    database_id, collection_id, key, 
                    required=required
                )
                print(f"Created attribute: {key}")
        except Exception as e:
            if "Attribute already exists" in str(e):
                print(f"Attribute {key} already exists - skipping")
            else:
                print(f"Error creating attribute {key}: {str(e)}")
                raise e

    print("Ensuring collection attributes exist...")
    # Create all attributes
    create_attr("chat_id", "string", 255)
    create_attr("title", "string", 255)
    create_attr("chat_session_total_context", "integer")
    create_attr("conversations", "string", 1073741823, False)
    create_attr("created_at", "string", 255)
    create_attr("updated_at", "string", 255)
    
    print("All attributes verified!")

def CreateNewChat(chat_id, chat_title, chat_session_total_context, conversations):
    try:
        print("Creating chat document...")
        
        chat_data = {
            "chat_id": chat_id,
            "title": chat_title,
            "chat_session_total_context": chat_session_total_context,
            "conversations": json.dumps(conversations),  # Convert to string
            "created_at": str(datetime.now().isoformat()),
            "updated_at": datetime.now().isoformat()
        }
        
        response = databases.create_document(
            database_id=AppwriteChatDatabase.database_id, 
            collection_id=AppwriteChatDatabase.collection_id, 
            document_id=ID.unique(), 
            data=chat_data
        )
        print("Chat Document Created:", response)
        return response
    except Exception as e:
        print(f"Error creating chat: {str(e)}")
        raise e

def UpdateChat(chat_id, conversations, total_context=0, title=None):
    try:
        # First get the document by chat_id
        docs = databases.list_documents(
            database_id=AppwriteChatDatabase.database_id,
            collection_id=AppwriteChatDatabase.collection_id,
            queries=[Query.equal("chat_id", chat_id)]
        )
        
        if not docs["documents"]:
            # Create new chat if it doesn't exist
            return CreateNewChat(
                chat_id=chat_id,
                chat_title=title or "New Chat",
                chat_session_total_context=total_context,
                conversations=conversations
            )
            
        doc = docs["documents"][0]
        
        # Prepare update data
        update_data = {
            "conversations": json.dumps(conversations),
            "chat_session_total_context": total_context,
            "updated_at": datetime.now().isoformat()
        }
        
        # Add title to update if provided
        if title:
            update_data["title"] = title
        
        # Update the document
        response = databases.update_document(
            database_id=AppwriteChatDatabase.database_id,
            collection_id=AppwriteChatDatabase.collection_id,
            document_id=doc["$id"],
            data=update_data
        )
        return response
    except Exception as e:
        print(f"Error updating chat: {str(e)}")
        raise e

def GetChat(chat_id):
    print("Getting chat document...")
    response = databases.get_document(
        AppwriteChatDatabase.database_id, 
        AppwriteChatDatabase.collection_id, 
        chat_id
    )
    print("Chat Document Retrieved:", response)
    return response

def DeleteAllChats():
    try:
        print("Deleting all chat documents...")
        documents = databases.list_documents(
            database_id=AppwriteChatDatabase.database_id,
            collection_id=AppwriteChatDatabase.collection_id
        )
        for doc in documents["documents"]:
            databases.delete_document(
                database_id=AppwriteChatDatabase.database_id,
                collection_id=AppwriteChatDatabase.collection_id,
                document_id=doc["$id"]
            )
        print("All chats deleted.")
        return True
    except Exception as e:
        print(f"Error deleting all chats: {str(e)}")
        raise e

def DeleteChat(chat_id):
    try:
        print(f"Deleting chat with chat_id: {chat_id}")
        docs = databases.list_documents(
            database_id=AppwriteChatDatabase.database_id,
            collection_id=AppwriteChatDatabase.collection_id,
            queries=[Query.equal("chat_id", chat_id)]
        )
        if not docs["documents"]:
            print("Chat not found.")
            return None
        doc = docs["documents"][0]
        databases.delete_document(
            database_id=AppwriteChatDatabase.database_id,
            collection_id=AppwriteChatDatabase.collection_id,
            document_id=doc["$id"]
        )
        print(f"Chat {chat_id} deleted.")
        return True
    except Exception as e:
        print(f"Error deleting chat: {str(e)}")
        raise e

def InitializeDatabase():
    try:
        # Create or get database
        db = CreateChatHistoryDatabase()
        AppwriteChatDatabase.initialize(db["$id"], None)
        
        # Create or get collection
        try:
            collection = CreateChatHistoryCollection(db["$id"])
            AppwriteChatDatabase.initialize(db["$id"], collection["$id"])
        except Exception as e:
            print(f"Collection creation failed, attempting to recreate: {e}")
            collection = CreateChatHistoryCollection(db["$id"])
            AppwriteChatDatabase.initialize(db["$id"], collection["$id"])
        
        print(f"Database initialized with ID: {AppwriteChatDatabase.database_id}")
        print(f"Collection initialized with ID: {AppwriteChatDatabase.collection_id}")
        
        return True
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        return False

# Initialize database when module is imported
InitializeDatabase()