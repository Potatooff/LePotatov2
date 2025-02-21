from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import json
import time
from src.core.integration.llm.openai_compatible_api import OpenaiCompatibleAPIService, current_max_tokens
from src.core.database.chats import AppwriteChatDatabase, CreateNewChat, UpdateChat, GetChat
from appwrite.query import Query
from src.core.database.constants import databases
from src.core.database.chats import DeleteAllChats, DeleteChat

app = FastAPI()

# Add Gzip middleware but exclude SSE endpoints
class CustomGZipMiddleware(GZipMiddleware):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Don't compress SSE endpoints
            path = scope.get("path", "")
            if path == "/user_chat" and scope.get("method") == "POST":
                return await self.app(scope, receive, send)
        return await super().__call__(scope, receive, send)

app.add_middleware(CustomGZipMiddleware, minimum_size=1000)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Accept-Encoding"],  # Add Accept-Encoding header
)

# Store chat sessions (in production, use a proper database)
chat_sessions = {}

class ChatRequest(BaseModel):
    session_id: str
    message: str
    model: str = "unsloth/DeepSeek-R1"
    temperature: float = 0.75
    top_p: float = 0.65
    top_k: int = 0
    stream: bool = False
    system_prompt: Optional[str] = None

class CreateChatRequest(BaseModel):
    chatId: str
    title: str

class MessageData(BaseModel):
    message_id: str
    message_position: int
    role: str
    content: str

class SaveChatRequest(BaseModel):
    messages: List[MessageData]

# Add an async wrapper to convert a synchronous generator into an async generator
async def async_wrapper(sync_gen):
    for item in sync_gen:
        yield item

async def stream_response(async_iterable, chat_session, UserMessage, session_id: str):  # Add session_id parameter
    buffer = ""
    full_response = ""  # Track complete response
    last_send_time = time.time()
    min_chunk_size = 4  # Minimum characters per chunk
    max_buffer_size = 50  # Maximum buffer size
    min_delay = 0.05  # 50ms minimum delay between chunks
    
    try:
        async for chunk in async_iterable:
            if chunk:
                buffer += chunk
                full_response += chunk  # Accumulate complete response
                current_time = time.time()
                time_since_last = current_time - last_send_time
                
                # Stream if we have a complete word/sentence or enough content
                should_stream = (
                    len(buffer) >= max_buffer_size or
                    time_since_last >= min_delay or
                    any(c in buffer[-1:] for c in ['.', '!', '?', '\n']) or
                    (len(buffer) >= min_chunk_size and buffer[-1] == ' ')
                )
                
                if should_stream and len(buffer.strip()) >= min_chunk_size:
                    current_context = chat_session.ContextCurrentChatHistory()
                    data = {
                        'content': buffer,
                        'totalTokens': current_context,
                        'maxTokens': current_max_tokens,
                        'tokensPerSecond': chat_session.tokens_per_second
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    await asyncio.sleep(0.02)  # Small delay for smoother streaming
                    buffer = ""
                    last_send_time = current_time

        # Flush remaining buffer
        if buffer:
            data = {
                'content': buffer,
                'totalTokens': chat_session.total_tokens,
                'maxTokens': current_max_tokens,
                'tokensPerSecond': chat_session.tokens_per_second
            }
            yield f"data: {json.dumps(data)}\n\n"

        # Generate title only once per chat
        if not getattr(chat_session, 'generated_title', False):
            conversation_for_title = " ".join(
                [msg["content"] for msg in chat_session.current_chat_history if msg.get("role") != "system"]
            )
            title = chat_session.GenerateChatTitle(conversation_for_title)
            chat_session.generated_title = True
            chat_session.current_title = title
        else:
            title = chat_session.current_title
        
        # After streaming is complete, save everything with new title and updated context
        if full_response:
            try:
                chat_history = chat_session.current_chat_history
                total_context = chat_session.ContextCurrentChatHistory()
                
                UpdateChat(
                    chat_id=session_id,
                    conversations=chat_history,
                    total_context=total_context,
                    title=title  # New title update
                )
                
                # Send final stats and title update
                final_data = {
                    'content': '',
                    'title': title,
                    'totalTokens': total_context,
                    'maxTokens': current_max_tokens,
                    'tokensPerSecond': chat_session.tokens_per_second
                }
                yield f"data: {json.dumps(final_data)}\n\n"
                
            except Exception as e:
                print(f"Error saving complete response: {str(e)}")
        
        yield "data: [DONE]\n\n"
    except Exception as e:
        print(f"Streaming error: {str(e)}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

@app.post("/user_chat")
async def chat(request: ChatRequest):
    if request.session_id not in chat_sessions:
        chat_sessions[request.session_id] = OpenaiCompatibleAPIService(
            api_key="kCOMF3x2kQP0kU2gkqTKUEmeXg5nZvE7",  # Replace with your valid API key
            base_url="https://test.darvinbox.click/v1",
            sys_prompt_supported=True,
            sys_prompt=request.system_prompt or ""
        )
    
    chat_session = chat_sessions[request.session_id]
    chat_session.NewUserMessage(request.message)

    try:
        if request.stream:
            # Add specific headers for SSE
            headers = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
            # Await the call to get the generator
            sync_gen = await chat_session.ChatCompletionCall(
                stream=True,
                model=request.model,
                temperature=request.temperature,
                top_p=request.top_p,
            )
            # Wrap the synchronous generator in an async wrapper
            return StreamingResponse(
                stream_response(
                    async_wrapper(sync_gen), 
                    chat_session, 
                    request.message,
                    request.session_id  # Pass the session_id here
                ),
                media_type="text/event-stream",
                headers=headers
            )
        else:
            # For non-streaming responses
            response, tokens, time_taken, tokens_per_second = await chat_session.ChatCompletionCall(
                stream=False,
                model=request.model,
                temperature=request.temperature,
                top_p=request.top_p,
            )
            return {
                "content": response,
                "totalTokens": tokens,
                "maxTokens": current_max_tokens,
                "tokensPerSecond": tokens_per_second
            }
    except Exception as e:
        print(f"Chat error: {str(e)}")  # Add error logging
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_total_context/{session_id}")
async def get_total_context(session_id: str):
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    chat_session = chat_sessions[session_id]
    total_context = chat_session.ContextCurrentChatHistory()
    
    return {
        "totalTokens": total_context,
        "maxTokens": current_max_tokens
    }

@app.get("/chats")
async def get_chats(limit: int = 3, offset: int = 0):
    try:
        if not AppwriteChatDatabase.database_id or not AppwriteChatDatabase.collection_id:
            raise HTTPException(status_code=500, detail="Database not initialized")
            
        # First get total count
        total_query = databases.list_documents(
            database_id=AppwriteChatDatabase.database_id,
            collection_id=AppwriteChatDatabase.collection_id,
            queries=[Query.limit(1)]  # Just to get total count efficiently
        )
        total_count = total_query["total"]
        
        # Then get the requested slice
        queries = [
            Query.order_desc('updated_at'),
            Query.limit(limit),
            Query.offset(offset)
        ]
        
        all_chats = databases.list_documents(
            database_id=AppwriteChatDatabase.database_id,
            collection_id=AppwriteChatDatabase.collection_id,
            queries=queries
        )
        
        chat_ids = [chat["chat_id"] for chat in all_chats["documents"]]
        
        return {
            "chats": chat_ids,
            "total": total_count  # Return the total count from initial query
        }
    except Exception as e:
        print(f"Error listing chats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/{chat_id}")
async def get_chat(chat_id: str):
    try:
        documents = databases.list_documents(
            AppwriteChatDatabase.database_id,
            AppwriteChatDatabase.collection_id,
            [Query.equal("chat_id", chat_id)]
        )
        
        if not documents["documents"]:
            raise HTTPException(status_code=404, detail="Chat not found")
            
        chat_data = documents["documents"][0]
        return {
            "chatId": chat_data["chat_id"],
            "title": chat_data["title"],
            "conversations": json.loads(chat_data["conversations"]),
            "created_at": chat_data["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/chat")
async def create_chat(request: CreateChatRequest):
    try:
        response = CreateNewChat(
            chat_id=request.chatId,
            chat_title=request.title,
            chat_session_total_context=0,
            conversations=[]  # Pass as empty list
        )
        return {"status": "success", "data": response}
    except Exception as e:
        print(f"Error creating chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/{chat_id}/save")
async def save_chat(chat_id: str, request: SaveChatRequest):
    try:
        if not AppwriteChatDatabase.database_id or not AppwriteChatDatabase.collection_id:
            raise HTTPException(status_code=500, detail="Database not initialized")
            
        if chat_id in chat_sessions:
            chat_session = chat_sessions[chat_id]
            total_context = chat_session.ContextCurrentChatHistory()
            chat_history = chat_session.current_chat_history
        else:
            total_context = 0
            chat_history = [{
                "role": msg.role,
                "content": msg.content
            } for msg in request.messages]
        
        response = UpdateChat(
            chat_id=chat_id,
            conversations=chat_history,
            total_context=total_context
        )
        return {"status": "success", "data": response}
    except Exception as e:
        print(f"Error saving chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/chats")
async def delete_all_chats():
    try:
        if not AppwriteChatDatabase.database_id or not AppwriteChatDatabase.collection_id:
            raise HTTPException(status_code=500, detail="Database not initialized")
        DeleteAllChats()
        return {"status": "success", "message": "All chats deleted"}
    except Exception as e:
        print(f"Error in deleting all chats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/chat/{chat_id}")
async def delete_chat(chat_id: str):
    try:
        if not AppwriteChatDatabase.database_id or not AppwriteChatDatabase.collection_id:
            raise HTTPException(status_code=500, detail="Database not initialized")
        result = DeleteChat(chat_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Chat not found")
        return {"status": "success", "message": f"Chat {chat_id} deleted"}
    except Exception as e:
        print(f"Error in deleting chat {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/chat/{chat_id}/position")
async def update_chat_position(chat_id: str):
    try:
        documents = databases.list_documents(
            AppwriteChatDatabase.database_id,
            AppwriteChatDatabase.collection_id,
            [Query.equal("chat_id", chat_id)]
        )
        
        if not documents["documents"]:
            raise HTTPException(status_code=404, detail="Chat not found")
            
        doc = documents["documents"][0]
        
        # Update the document's updated_at timestamp to move it to top
        response = databases.update_document(
            database_id=AppwriteChatDatabase.database_id,
            collection_id=AppwriteChatDatabase.collection_id,
            document_id=doc["$id"],
            data={
                "updated_at": datetime.now().isoformat()
            }
        )
        return {"status": "success", "data": response}
    except Exception as e:
        print(f"Error updating chat position: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
