from fastapi import FastAPI # type: ignore
from app.llm import LLMBridge
from pydantic import BaseModel
from typing import List
from app.gesture import detect_gesture
from app.emotion import EmotionDetector

emotion_detector = EmotionDetector()

llm = LLMBridge()

app = FastAPI(title="SignBridge AI Service")

class HandData(BaseModel):
    landmarks: List[List[float]]

class TextInput(BaseModel):
    text: str

class FullInput(BaseModel):
    landmarks: list
    text: str


@app.get("/")
def home():
    return {"message": "AI Service Running"}

@app.post("/process")
def process(data: FullInput):

    word = detect_gesture(data.landmarks)

    sentence = llm.refine(data.text)

    emotion = emotion_detector.detect()

    return {
        "word": word,
        "sentence": sentence,
        "emotion": emotion
    }

