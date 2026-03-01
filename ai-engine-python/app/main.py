from fastapi import FastAPI # type: ignore
from pydantic import BaseModel
from typing import List
from app.gesture import detect_gesture

app = FastAPI(title="SignBridge AI Service")

class HandData(BaseModel):
    landmarks: List[List[float]]


@app.get("/")
def home():
    return {"message": "AI Service Running"}

@app.post("/predict")
def predict(data: HandData):
    word = detect_gesture(data.landmarks)

    return {
        "word": word
    }

