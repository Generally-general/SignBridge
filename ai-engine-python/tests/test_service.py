from app.engine.config import EngineConfig
from app.engine.service import EngineService


class FakeRecognizer:
    """Frames carry their label directly: (t, "HELLO")."""

    def classify(self, landmarks):
        return landmarks if isinstance(landmarks, str) else None


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def make(cfg=None):
    clock = Clock()
    svc = EngineService(cfg=cfg or EngineConfig(), recognizer=FakeRecognizer(), clock=clock)
    return svc, clock


def frames(label, n, start=0, step=60):
    return [(start + i * step, label) for i in range(n)]


def test_held_sign_produces_one_word_not_many():
    svc, _ = make()
    out = svc.ingest("room:1", frames("HELLO", 50))
    assert out["utterance"]["words"] == ["hello"]
    assert out["utterance"]["final"] is False
    assert out["changed"] is True


def test_hold_split_across_batches_still_emits_once():
    svc, _ = make()
    all_words = []
    t = 0
    for _ in range(10):  # 10 batches of 5 frames
        out = svc.ingest("room:1", frames("HELLO", 5, start=t))
        t += 5 * 60
        all_words += [e["word"] for e in out["events"]]
    assert all_words == ["hello"]


def test_sentence_is_finalized_by_tick_after_pause():
    svc, clock = make()
    svc.ingest("room:1", frames("HELLO", 20))
    out = svc.tick("room:1")
    assert out["changed"] is False and out["retry_in_ms"] > 0

    clock.now += 2.0  # 2 s of silence > pause_ms
    out = svc.tick("room:1")
    assert out["changed"] is True
    assert out["utterance"]["final"] is True
    assert out["utterance"]["words"] == ["hello"]

    # the utterance is cleared afterwards
    assert svc.tick("room:1")["utterance"] is None


def test_words_accumulate_until_pause():
    svc, clock = make()
    svc.ingest("room:1", frames("HELLO", 20))
    clock.now += 0.5
    out = svc.ingest("room:1", frames("FOUR", 20, start=2000))
    assert out["utterance"]["words"] == ["hello", "four"]
    assert out["utterance"]["final"] is False


def test_utterance_closes_when_it_reaches_max_words():
    cfg = EngineConfig(max_words=2)
    svc, _ = make(cfg)
    svc.ingest("room:1", frames("HELLO", 20))
    out = svc.ingest("room:1", frames("FOUR", 20, start=2000))
    assert out["utterance"]["final"] is True
    assert out["utterance"]["words"] == ["hello", "four"]
    assert svc.tick("room:1")["utterance"] is None


def test_sessions_are_independent():
    svc, _ = make()
    svc.ingest("room:1", frames("HELLO", 20))
    out = svc.ingest("room:2", frames("FOUR", 20))
    assert out["utterance"]["words"] == ["four"]


def test_frames_without_landmarks_never_create_words():
    svc, _ = make()
    out = svc.ingest("room:1", [(i * 60, None) for i in range(50)])
    assert out["utterance"] is None and out["changed"] is False


def test_unknown_session_tick_is_harmless():
    svc, _ = make()
    assert svc.tick("nobody")["utterance"] is None


def test_long_hold_past_the_pause_does_not_repeat_the_word():
    """Regression: finalizing the sentence must not un-latch a pose that is still held."""
    svc, clock = make()
    out = svc.ingest("room:1", frames("HELLO", 20))           # sign emitted
    assert out["utterance"]["words"] == ["hello"]

    clock.now += 2.0                                           # pause passes while still holding
    final = svc.tick("room:1")
    assert final["utterance"]["final"] is True

    out = svc.ingest("room:1", frames("HELLO", 40, start=1200))  # same pose keeps being held
    assert out["events"] == []
    assert out["utterance"] is None
    


def test_final_sentence_is_punctuated_and_interim_is_not():
    svc, clock = make()
    out = svc.ingest("room:1", frames("HELLO", 20))
    assert out["utterance"]["sentence"] == "Hello"
    clock.now += 2.0
    assert svc.tick("room:1")["utterance"]["sentence"] == "Hello!"
    


def test_finalize_closes_the_pending_sentence_immediately():
    svc, _ = make()
    svc.ingest("room:1", frames("HELLO", 20))           # sentence still open (no pause yet)
    out = svc.finalize("room:1")
    assert out["changed"] is True
    assert out["utterance"]["final"] is True
    assert out["utterance"]["words"] == ["hello"]
    assert svc.finalize("room:1")["utterance"] is None   # nothing left to close
    assert svc.tick("room:1")["utterance"] is None


def test_finalize_with_nothing_pending_or_unknown_session_is_harmless():
    svc, _ = make()
    assert svc.finalize("nobody")["changed"] is False
    svc.ingest("room:1", [(i * 60, None) for i in range(10)])
    assert svc.finalize("room:1")["utterance"] is None