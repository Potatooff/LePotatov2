from os import getenv
from openai import OpenAI
from dotenv import load_dotenv
  
# Env
load_dotenv()
EXAM_GEN_API_KEY: str = getenv("EXAM_GEN_API_KEY")
EXAM_GEN_BASE_URL: str = getenv("EXAM_GEN_BASE_URL")

# Samplers
MODEL_NAME = "deepseek-reasoner"
TEMPERATURE = 0.75
TOP_P = 0.65
TOP_K = 0


class LLM_Microservice:

    def __init__(self):
        # Client
        self.client: OpenAI = OpenAI(
            api_key=EXAM_GEN_API_KEY,
            base_url=EXAM_GEN_BASE_URL,
        )

    def ChatCompletionCall(self, sys_prompt: str, query: str):
        response = self.client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": query}
            ],
        )

        return response

