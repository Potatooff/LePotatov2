from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
#from src.utils.settings_json import load_settings
from src.api.endpoint import app

# Load settings
#settings = load_settings()


 
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )