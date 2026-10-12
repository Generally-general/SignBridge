from app.engine.recognizer import PoseRecognizer


def test_malformed_landmarks_never_raise():
    r = PoseRecognizer()
    assert r.classify(None) is None
    assert r.classify([]) is None
    assert r.classify([[0, 0, 0]] * 5) is None
    assert r.classify([[0.5, 0.5, 0.0]] * 21) is None  # degenerate: zero palm width