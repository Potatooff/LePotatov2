from openai import OpenAI
import time, tiktoken

# Samplers
MODEL_NAME = "deepseek-reasoner"
TEMPERATURE = 0.75
TOP_P = 0.65
TOP_K = 0
current_max_tokens = 8192

class OpenaiCompatibleAPIService:

    def __init__(self, api_key: str, base_url: str, sys_prompt_supported: bool = True, sys_prompt: str = ""):
        # Client
        self.client: OpenAI = OpenAI(
            api_key=api_key,
            base_url=base_url
        )

        self.sys_prompt_supported = sys_prompt_supported
        if self.sys_prompt_supported:
            self.current_chat_history = [
                {"role": "system", "content": sys_prompt}
            ]
        else:
            self.current_chat_history = []

        self.total_tokens = 0
        self.tokens_per_second = 0
        self.start_time = None

    def NewUserMessage(self, message: str):
        self.current_chat_history.append({"role": "user", "content": message})

    def NewAssistantMessage(self, message: str):
        self.current_chat_history.append({"role": "assistant", "content": message})

    def stream_chat_completion(self, **kwargs):
        """Non-async method for streaming"""
        self.start_time = time.time()
        response = self.client.chat.completions.create(
            messages=self.current_chat_history,
            stream=True,
            **kwargs
        )
        
        full_response = ""
        token_count = 0
        
        for chunk in response:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                token_count += 1
                self.total_tokens = token_count
                time_elapsed = time.time() - self.start_time
                self.tokens_per_second = token_count / time_elapsed if time_elapsed > 0 else 0
                yield content
                
        
        print(full_response)
        self.NewAssistantMessage(full_response)
        print(self.ContextCurrentChatHistory())

    async def ChatCompletionCall(self, stream=False, **kwargs):
        """Async method for non-streaming responses"""
        if stream:
            return self.stream_chat_completion(**kwargs)
            
        start_time = time.time()
        response = self.client.chat.completions.create(
            messages=self.current_chat_history,
            stream=False,
            **kwargs
        )

        completion_time = time.time() 
        content = response.choices[0].message.content
        total_tokens = response.usage.total_tokens
        time_taken = completion_time - start_time
        tokens_per_second = total_tokens / time_taken if time_taken > 0 else 0
        
        self.NewAssistantMessage(content)
        return content, total_tokens, time_taken, tokens_per_second
    

    def ContextCurrentChatHistory(self):
        """Return the number of tokens used by a list of messages."""
        try:
            model="gpt-4o-2024-08-06"
            messages = self.current_chat_history
            encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            print("Warning: model not found. Using o200k_base encoding.")
            encoding = tiktoken.get_encoding("o200k_base")
        if model in {
            "gpt-4o-mini-2024-07-18",
            "gpt-4o-2024-08-06"
            }:
            tokens_per_message = 3
            tokens_per_name = 1
        elif "gpt-4o-mini" in model:
            print("Warning: gpt-4o-mini may update over time. Returning num tokens assuming gpt-4o-mini-2024-07-18.")
            return self.ContextCurrentChatHistory(messages, model="gpt-4o-mini-2024-07-18")
        elif "gpt-4o" in model:
            print("Warning: gpt-4o and gpt-4o-mini may update over time. Returning num tokens assuming gpt-4o-2024-08-06.")
            return self.ContextCurrentChatHistory(messages, model="gpt-4o-2024-08-06")
        else:
            raise NotImplementedError(
                f"""num_tokens_from_messages() is not implemented for model {model}."""
            )
        
        num_tokens = 0
        for message in messages:
            num_tokens += tokens_per_message
            for key, value in message.items():
                num_tokens += len(encoding.encode(value))
                if key == "name":
                    num_tokens += tokens_per_name
        num_tokens += 3  # every reply is primed with <|start|>assistant<|message|>
        return num_tokens
    

    def GenerateChatTitle(self, UserMessage):
        import numpy as np
        import re

        def rule_based_title(text: str, ngram_min=5, ngram_max=6):
            # Basic English stop words
            stop_words = {
                "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", 
                "at", "by", "for", "with", "about", "as", "into", "like", "through",
                "after", "over", "between", "out", "against", "during", "without",
                "before", "under", "around", "among", "i", "you", "he", "she", "it"
            }
            
            # Preprocess text
            text = re.sub(r"[^\w\s]", "", text.lower())
            tokens = [word for word in text.split() if word not in stop_words]
            
            # Generate n-grams
            ngrams = []
            for n in range(ngram_min, ngram_max+1):
                ngrams += [' '.join(tokens[i:i+n]) for i in range(len(tokens)-n+1)]
            
            if not ngrams:
                return ""
            
            # Get sorted unique ngrams and their counts
            unique_ngrams, counts = np.unique(ngrams, return_counts=True)
            max_count = np.max(counts)
            
            # Find first most frequent ngram (sorted lexicographically)
            return unique_ngrams[np.argmax(counts == max_count)].title()


        title = rule_based_title(UserMessage)
        print(title)

        return title