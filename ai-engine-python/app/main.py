from fastapi import FastAPI # type: ignore
from pydantic import BaseModel
from typing import List


app = FastAPI(title="SignBridge AI Service")

class HandData(BaseModel):
    landmarks: List[List[float]]


@app.get("/")
def home():
    return {"message": "AI Service Running"}

@app.post("/predict")
def predict(data: HandData):

    # temporary mock response
    return {
        "gesture": "HELLO",
        "received_points": len(data.landmarks)
    }