from typing import Optional, Protocol

from app.gesture import detect_gesture


class Recognizer(Protocol):
    """Anything that maps one frame of hand landmarks to a label (or None)."""

    def classify(self, landmarks) -> Optional[str]:
        ...


class PoseRecognizer:
    """Current recognizer: the rule-based static pose classifier (gesture.py).

    A learned recognizer can replace this behind the same interface.
    """

    def classify(self, landmarks) -> Optional[str]:
        if not landmarks or len(landmarks) < 21:
            return None
        try:
            label = detect_gesture(landmarks)
        except Exception:
            return None
        return None if label == "UNKNOWN" else label