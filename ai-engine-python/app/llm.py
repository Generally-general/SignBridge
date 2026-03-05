import requests


class LLMBridge:

    def __init__(self, model="phi3"):
        self.url = "http://localhost:11434/api/generate"
        self.model = model

    def refine(self, text: str) -> str:

        prompt = (
            "Convert the following sign language phrase into "
            "a grammatically correct natural English sentence:\n"
            f"{text}"
        )

        response = requests.post(
            self.url,
            json={
                "model": self.model,
                "prompt": prompt,
                "stream": False
            },
            timeout=10
        )

        return response.json()["response"].strip()