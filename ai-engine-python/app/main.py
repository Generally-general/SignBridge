import logging
import os
from collections import Counter
from pathlib import Path
from typing import List, Optional

from app.dictionary import to_display_word
from app.emotion import EmotionDetector
from app.engine.isl import IslModel
from app.engine.recognizer import PoseRecognizer
from app.engine.service import EngineService
from app.gesture import detect_gesture
from app.grammar import correct_grammar
from app.llm import LLMBridge
from fastapi import FastAPI  # type: ignore
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("signbridge")


def _load_isl_model():
    """The trained Indian Sign Language model, from models/isl (or $ISL_MODEL_DIR). None if it is missing."""
    folder = Path(
        os.environ.get("ISL_MODEL_DIR")
        or Path(__file__).resolve().parent.parent / "models" / "isl"
    )
    if not (folder / "isl50.onnx").exists():
        log.warning(
            "ISL model not found in %s: using the static-pose recognizer only", folder
        )
        return None
    try:
        model = IslModel.load(folder)
        log.info("ISL model loaded from %s: %d words", folder, len(model.labels))
        return model
    except Exception as exc:  # a broken model must not take the whole service down
        log.error(
            "ISL model could not be loaded (%s): using the static-pose recognizer only",
            exc,
        )
        return None


emotion_detector = EmotionDetector()
llm = LLMBridge()
isl_model = _load_isl_model()
engine = EngineService(
    recognizer=PoseRecognizer(), emotion=emotion_detector, isl_model=isl_model
)

app = FastAPI(title="SignBridge AI Service")


class PredictInput(BaseModel):
    landmarks: List[List[List[float]]]  # [frame][point][x, y, z]
    words: Optional[List[str]] = (
        None  # accumulated word sequence so far, from signaling-node
    )


class FrameIn(BaseModel):
    t: float  # sender timestamp, ms
    landmarks: Optional[List[List[float]]] = None  # 21 x [x, y, z]
    hands: Optional[List[List[List[float]]]] = None


class IngestInput(BaseModel):
    session_id: str
    frames: List[FrameIn]


class TickInput(BaseModel):
    session_id: str


@app.get("/")
def home():
    return {"message": "AI Service Running", "recognizer": "isl" if isl_model is not None else "pose"}


@app.post("/ingest")
def ingest(data: IngestInput):
    """Stateful path: frames in, sign events + utterance state out."""
    return engine.ingest(data.session_id, [(f.t, f.landmarks, f.hands) for f in data.frames])


@app.post("/tick")
def tick(data: TickInput):
    """Called by the signaling server after a pause so a finished sentence is closed."""
    return engine.tick(data.session_id)


@app.post("/finalize")
def finalize(data: TickInput):
    """Called when a call ends so the last, not-yet-paused sentence is not lost."""
    return engine.finalize(data.session_id)


@app.post("/session/end")
def end_session(data: TickInput):
    engine.drop(data.session_id)
    return {"ok": True}


@app.post("/predict")
def predict(data: PredictInput):
    """Legacy stateless path (kept for the manual test scripts). Not used by the app."""
    frame_words = [detect_gesture(frame) for frame in data.landmarks if frame]
    frame_words = [w for w in frame_words if w != "UNKNOWN"]

    raw_word = Counter(frame_words).most_common(1)[0][0] if frame_words else "UNKNOWN"
    word = to_display_word(raw_word) if raw_word != "UNKNOWN" else "UNKNOWN"

    word_sequence = list(data.words or [])
    if word != "UNKNOWN":
        word_sequence.append(word)

    sentence = correct_grammar(word_sequence)
    emotion = emotion_detector.detect(data.landmarks)

    return {"word": word, "sentence": sentence, "emotion": emotion}
