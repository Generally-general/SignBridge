from app.engine.config import EngineConfig
from app.engine.stabilizer import SignStabilizer

STEP = 60  # ms between frames (~16 fps)


def run(labels, start=0, step=STEP, cfg=None):
    """Feed a label sequence; return (events, last_t)."""
    stab = SignStabilizer(cfg or EngineConfig())
    events = []
    t = start
    for lab in labels:
        ev = stab.update(t, lab)
        if ev:
            events.append(ev)
        t += step
    return events, t


def test_held_sign_is_emitted_once():
    events, _ = run(["HELLO"] * 50)  # 3 seconds
    assert [e.label for e in events] == ["HELLO"]


def test_short_flick_is_ignored():
    events, _ = run(["HELLO"] * 3 + [None] * 20)  # ~180 ms
    assert events == []


def test_single_frame_flicker_does_not_break_a_hold():
    labels = ["HELLO"] * 30
    labels[10] = None
    labels[20] = "FIST"
    events, _ = run(labels)
    assert [e.label for e in events] == ["HELLO"]


def test_repeat_requires_a_release():
    labels = ["HELLO"] * 20 + [None] * 12 + ["HELLO"] * 20
    events, _ = run(labels)
    assert [e.label for e in events] == ["HELLO", "HELLO"]


def test_direct_change_emits_both_in_order():
    labels = ["HELLO"] * 20 + ["FOUR"] * 20
    events, _ = run(labels)
    assert [e.label for e in events] == ["HELLO", "FOUR"]


def test_time_gap_means_hand_left_so_same_sign_counts_again():
    stab = SignStabilizer(EngineConfig())
    events = []
    t = 0
    for _ in range(20):
        ev = stab.update(t, "HELLO")
        events += [ev] if ev else []
        t += STEP
    t += 1000  # hand out of view, no frames
    for _ in range(20):
        ev = stab.update(t, "HELLO")
        events += [ev] if ev else []
        t += STEP
    assert [e.label for e in events] == ["HELLO", "HELLO"]


def test_no_labels_means_no_events():
    events, _ = run([None] * 60)
    assert events == []


def test_confidence_is_between_zero_and_one():
    events, _ = run(["HELLO"] * 20)
    assert 0.5 <= events[0].confidence <= 1.0


def test_low_agreement_is_not_emitted():
    labels = ["HELLO", "FOUR", "HELLO", "FIST", "FOUR", "HELLO", "FIST", "FOUR"] * 6
    events, _ = run(labels)
    assert events == []