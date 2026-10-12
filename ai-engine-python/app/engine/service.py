import time
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

from .config import EngineConfig
from .interpreter import Interpreter
from .isl import IslSignDetector
from .lexicon import Lexicon
from .phrases import Phrases
from .stabilizer import SignStabilizer
from .utterance import SignedWord, UtteranceBuilder

Frame = Tuple[Any, ...]  # (timestamp_ms, landmarks or None) or (timestamp_ms, landmarks or None, hands)


class _Session:
    def __init__(self, cfg: EngineConfig, now: float, isl_model=None):
        self.stabilizer = SignStabilizer(cfg)
        self.utterance = UtteranceBuilder(cfg)
        self.touched = now
        self.isl = IslSignDetector(isl_model, cfg) if isl_model is not None else None
        self.last_frame_t: Optional[float] = None      # sender clock (ms) of the newest frame
        self.last_frame_clock: Optional[float] = None  # engine clock (s) when it arrived

    def isl_now(self, now: float) -> Optional[float]:
        """"Now" on the sender's clock, for closing a sign when no frames are arriving."""
        if self.last_frame_t is None or self.last_frame_clock is None:
            return None
        return self.last_frame_t + (now - self.last_frame_clock) * 1000.0


class EngineService:
    """Per-session sign -> utterance engine (state lives here, not in Node)."""

    def __init__(
        self,
        cfg: Optional[EngineConfig] = None,
        recognizer=None,
        emotion=None,
        clock: Callable[[], float] = time.monotonic,
        lexicon: Optional[Lexicon] = None,
        interpreter: Optional[Interpreter] = None,
        isl_model=None,
        phrases: Optional[Phrases] = None,
    ):
        self.cfg = cfg or EngineConfig()
        self.recognizer = recognizer
        self.isl_model = isl_model  # the trained word-level model, or None (static poses only)
        self.emotion = emotion
        self.clock = clock
        self.lexicon = lexicon or Lexicon.load()
        self.interpreter = interpreter or Interpreter(
            self.lexicon, self.cfg, phrases if phrases is not None else Phrases.load()
        )
        self._sessions: Dict[str, _Session] = {}
        self._last_purge = clock()

    # ---- sessions -------------------------------------------------------
    def _session(self, session_id: str, now: float) -> _Session:
        if now - self._last_purge > 60:
            self._last_purge = now
            ttl = self.cfg.session_ttl_s
            for sid in [k for k, s in self._sessions.items() if now - s.touched > ttl]:
                del self._sessions[sid]
        s = self._sessions.get(session_id)
        if s is None:
            s = _Session(self.cfg, now, self.isl_model)
            self._sessions[session_id] = s
        s.touched = now
        return s

    def drop(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    # ---- API ------------------------------------------------------------
    def ingest(self, session_id: str, frames: Sequence[Frame]) -> dict:
        now = self.clock()
        s = self._session(session_id, now)

        new_words: List[SignedWord] = []
        recent_landmarks: List[Any] = []
        for frame in frames:
            t_ms, landmarks = frame[0], frame[1]
            hands = frame[2] if len(frame) > 2 else None
            if landmarks:
                recent_landmarks.append(landmarks)

            if s.isl is not None and hands is not None:
                # word-level path: the frame carries up to two hands
                s.last_frame_t, s.last_frame_clock = float(t_ms), now
                for event in s.isl.push(float(t_ms), hands):
                    new_words.append(self._add_event(s, event, now))
                continue

            # static-pose path (older clients, or no trained model loaded)
            label = self.recognizer.classify(landmarks) if landmarks else None
            event = s.stabilizer.update(float(t_ms), label)
            if event is not None:
                new_words.append(self._add_event(s, event, now))

        final = s.utterance.full
        result = self._result(session_id, s, now, new_words, final, recent_landmarks)
        return self._with_sign_retry(result, s, now)

    def tick(self, session_id: str) -> dict:
        now = self.clock()
        s = self._sessions.get(session_id)
        if s is None:
            return self._empty(session_id)

        # a sign whose hands have left view is finished: classify it
        new_words: List[SignedWord] = []
        if s.isl is not None:
            isl_now = s.isl_now(now)
            if isl_now is not None:
                for event in s.isl.poll(isl_now):
                    new_words.append(self._add_event(s, event, now))
        if new_words:
            result = self._result(session_id, s, now, new_words, s.utterance.full, [])
            return self._with_sign_retry(result, s, now)

        if not s.utterance.pending:
            return self._with_sign_retry(self._empty(session_id), s, now)

        remaining = s.utterance.ms_until_pause(now)
        final = remaining is not None and remaining <= 0
        # never close the sentence while the signer is in the middle of the next sign
        if final and s.isl is not None and s.isl.segmenter.active:
            final, remaining = False, 300.0
        if not final:
            result = self._empty(session_id)
            result["retry_in_ms"] = max(0.0, remaining)
            return self._with_sign_retry(result, s, now)
        return self._with_sign_retry(self._result(session_id, s, now, [], True, []), s, now)

    def finalize(self, session_id: str) -> dict:
        """Close the pending sentence now (the call is ending). Safe when nothing is pending."""
        s = self._sessions.get(session_id)
        if s is None:
            return self._empty(session_id)
        if s.isl is not None:  # a sign still being made counts
            for event in s.isl.flush():
                self._add_event(s, event, self.clock())
        if not s.utterance.pending:
            return self._empty(session_id)
        return self._result(session_id, s, self.clock(), [], True, [])

    # ---- helpers --------------------------------------------------------
    def _add_event(self, s: _Session, event, now: float) -> SignedWord:
        word = SignedWord(
            label=event.label,
            word=self.lexicon.text(event.label),
            confidence=event.confidence,
            t_ms=event.t_ms,
        )
        s.utterance.add(word, now)
        return word

    def _with_sign_retry(self, result: dict, s: _Session, now: float) -> dict:
        """While a sign is open the signaling server must call tick() again soon, even if no frames arrive."""
        if s.isl is None:
            return result
        isl_now = s.isl_now(now)
        wait = s.isl.ms_until_close(isl_now) if isl_now is not None else None
        if wait is not None:
            current = result.get("retry_in_ms")
            result["retry_in_ms"] = wait if current is None else min(current, wait)
        return result

    def _empty(self, session_id: str) -> dict:
        return {
            "session_id": session_id,
            "events": [],
            "changed": False,
            "word": None,
            "utterance": None,
            "emotion": "neutral",
            "retry_in_ms": None,
        }

    def _result(self, session_id, s, now, new_words, final, landmarks) -> dict:
        words_now = s.utterance.words
        if not words_now:
            return self._empty(session_id)

        interpretation = self.interpreter.interpret(words_now, final=bool(final))
        utterance = {
            "words": [w.word for w in words_now],
            "sentence": interpretation.sentence,
            "uncertain": interpretation.uncertain,
            "final": bool(final),
            "confidence": round(min(w.confidence for w in words_now), 3),
        }

        emotion = "neutral"
        if self.emotion is not None and landmarks:
            try:
                emotion = self.emotion.detect(landmarks[-15:])
            except Exception:
                emotion = "neutral"

        retry = None
        if final:
            # Only the sentence is closed. The stabilizer keeps its latch, so a
            # pose that is still being held is not re-emitted as a new word.
            s.utterance.take()
        else:
            retry = max(0.0, s.utterance.ms_until_pause(now) or 0.0)

        return {
            "session_id": session_id,
            "events": [
                {"label": w.label, "word": w.word, "confidence": w.confidence, "t_ms": w.t_ms}
                for w in new_words
            ],
            "changed": bool(new_words) or bool(final),
            "word": new_words[-1].word if new_words else None,
            "utterance": utterance,
            "emotion": emotion,
            "retry_in_ms": retry,
        }