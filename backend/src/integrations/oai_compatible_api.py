from openai import OpenAI
from typing import Generator, Dict, Any

# Samplers
MODEL_NAME = "deepseek-chat"
TEMPERATURE = 0.75
TOP_P = 0.65
TOP_K = 0

class OpenAICompatibleAPI:
    def __init__(self, api_key: str, base_url: str):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.current_chat_history = []


    def NewUserMessage(self, message):
        self.current_chat_history.append({"role": "user", "content": message})

    def NewAssistantResponse(self, message):
        self.current_chat_history.append({"role": "assistant", "content": message})


    def ChatCompletionCall(self, stream: bool = False, **kwargs) -> Generator[Dict[str, Any], None, None]:
        """Enhanced chat completion with streaming support"""
        response = self.client.chat.completions.create(
            messages=self.current_chat_history,
            stream=stream,
            **kwargs
        )

        if stream:
            full_response = ""
            total_tokens = 0
            
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    # Approximate token count for streaming
                    total_tokens += len(content.split()) + 1
                    yield {"content": content, "total_tokens": total_tokens}
            
            self.NewAssistantResponse(full_response)
        else:
            content = response.choices[0].message.content
            total_tokens = response.usage.total_tokens
            self.NewAssistantResponse(content)
            yield {"content": content, "total_tokens": total_tokens}



chat_session = OpenAICompatibleAPI(
    api_key="kCOMF3x2kQP0kU2gkqTKUEmeXg5nZvE7",
    base_url="https://api.mistral.ai/v1"
)

# Example usage
chat_session.NewUserMessage("Hello, how are you?")
assistant_response, chat_session_total_tokens = chat_session.ChatCompletionCall(model="mistral-small-latest")
chat_session.NewAssistantResponse(assistant_response)
