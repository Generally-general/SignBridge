from collections import Counter, deque
from dataclasses import dataclass
from typing import Deque, Optional, Tuple

from .config import EngineConfig


@dataclass
class SignEvent:
    label: str
    t_ms: float
    confidence: float
    duration_ms: float


class SignStabilizer:
    """Turns noisy per-frame labels into discrete sign events.

    A sign is emitted ONCE when one label dominates the last `hold_ms` of
    frames. It is then latched: it is not emitted again until it stops
    dominating (the signer changed pose, or the hand left). This is what stops
    a held pose from being reported over and over, and what lets a deliberate
    repeat (release, then sign again) count as a second sign.
    """

    def __init__(self, cfg: EngineConfig):
        self.cfg = cfg
        self._buf: Deque[Tuple[float, Optional[str]]] = deque()
        self._latched: Optional[str] = None
        self._last_t: Optional[float] = None

    def reset(self) -> None:
        self._buf.clear()
        self._latched = None
        self._last_t = None

    def update(self, t_ms: float, label: Optional[str]) -> Optional[SignEvent]:
        cfg = self.cfg

        # A long silence between frames means the hand left the view.
        if self._last_t is not None and t_ms - self._last_t >= cfg.gap_ms:
            self._buf.clear()
            self._latched = None
        self._last_t = t_ms

        self._buf.append((t_ms, label))
        while self._buf and t_ms - self._buf[0][0] > cfg.hold_ms:
            self._buf.popleft()

        span = t_ms - self._buf[0][0]
        if span < cfg.hold_ms * 0.9 or len(self._buf) < 3:
            return None  # not enough evidence yet

        total = len(self._buf)
        counts = Counter(l for _, l in self._buf if l is not None)

        if self._latched is not None and counts.get(self._latched, 0) / total < cfg.unlatch_agreement:
            self._latched = None

        if not counts:
            return None

        top, n = counts.most_common(1)[0]
        agreement = n / total
        if agreement < cfg.min_agreement or top == self._latched:
            return None

        self._latched = top
        confidence = round(agreement * min(1.0, span / cfg.hold_ms), 3)
        return SignEvent(label=top, t_ms=t_ms, confidence=confidence, duration_ms=span)