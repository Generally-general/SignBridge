from dataclasses import dataclass
from typing import List, Optional

from .config import EngineConfig


@dataclass
class SignedWord:
    label: str        # raw recognizer label, e.g. "HELLO"
    word: str         # display word, e.g. "hello"
    confidence: float
    t_ms: float


class UtteranceBuilder:
    """Collects recognized signs until the signer pauses.

    The pause is measured from the last emitted sign (not from the last frame),
    so a pose that is still being held in view does not keep the sentence open.
    """

    def __init__(self, cfg: EngineConfig):
        self.cfg = cfg
        self.words: List[SignedWord] = []
        self.last_sign_at: Optional[float] = None  # engine clock, seconds

    def add(self, word: SignedWord, now: float) -> None:
        self.words.append(word)
        self.last_sign_at = now

    @property
    def pending(self) -> bool:
        return bool(self.words)

    @property
    def full(self) -> bool:
        return len(self.words) >= self.cfg.max_words

    def ms_until_pause(self, now: float) -> Optional[float]:
        """Milliseconds until the pause boundary; <= 0 means it has passed."""
        if not self.words or self.last_sign_at is None:
            return None
        return self.cfg.pause_ms - (now - self.last_sign_at) * 1000.0

    def take(self) -> List[SignedWord]:
        words, self.words, self.last_sign_at = self.words, [], None
        return words