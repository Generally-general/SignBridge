from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def hand_frame(t):
    # An arbitrary frame; we only check the API contract here.
    return {"t": t, "landmarks": [[0.5 + 0.01 * i, 0.5 - 0.01 * i, 0.0] for i in range(21)]}


def test_ingest_contract_and_unknown_session_tick():
    r = client.post("/ingest", json={"session_id": "t:1", "frames": [hand_frame(i * 60) for i in range(30)]})
    assert r.status_code == 200
    body = r.json()
    for key in ("session_id", "events", "changed", "word", "utterance", "emotion", "retry_in_ms"):
        assert key in body

    t = client.post("/tick", json={"session_id": "does-not-exist"})
    assert t.status_code == 200 and t.json()["utterance"] is None

    assert client.post("/session/end", json={"session_id": "t:1"}).json() == {"ok": True}


def test_ingest_rejects_bad_payload():
    assert client.post("/ingest", json={"frames": []}).status_code == 422
    


def test_finalize_endpoint_exists_and_is_harmless_for_unknown_sessions():
    r = client.post("/finalize", json={"session_id": "does-not-exist"})
    assert r.status_code == 200 and r.json()["utterance"] is None