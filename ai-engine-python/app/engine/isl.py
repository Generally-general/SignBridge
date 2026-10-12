"""Word-level Indian Sign Language recognition (the INCLUDE-50 model).

The browser sends the keypoints of up to two hands a few times a second. This module

1. cuts that stream into separate signs                      (SignSegmenter)
2. classifies each sign with the trained model               (IslModel)
3. joins the two, with per-session state                     (IslSignDetector)

The model was trained on whole videos of ONE sign each, so a live sign has to be cut out of the stream
the same way: from where the hands appear to where they leave (or stop moving), with a little
"no hands" padding before and after, resampled to a fixed length by the same feature code that built
the training set (app/features.py).
"""

import bisect
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

import numpy as np
from app.features import (
    FEATURE_DIM,
    FEATURE_VERSION,
    T_DEFAULT,
    assign_tracks,
    featurize,
)

from .config import EngineConfig

log = logging.getLogger("signbridge.isl")

GRID_MS = 40.0  # clips are resampled to 25 fps before featurizing (the training videos were 25-30 fps)
NEAR_MS = 100.0  # a grid step takes the nearest real frame within this distance, else "no hands"
MIN_VISIBLE_FRAMES = 5
_TIPS = [
    0,
    4,
    8,
    12,
    16,
    20,
]  # wrist + the five fingertips: enough to measure hand motion
_SAME_HAND_DIST = (
    0.35  # wrists further apart than this between two frames are different hands
)
_EMA = 0.35  # smoothing of the hand speed


# ------------------------------------------------------------------------------ the model
class IslModel:
    """The trained classifier (ONNX), its labels and its confidence calibration."""

    def __init__(
        self,
        session,
        labels: Sequence[str],
        temperature: float,
        T: int = T_DEFAULT,
        feature_dim: int = FEATURE_DIM,
    ):
        self._session = session
        self._input = session.get_inputs()[0].name
        self.labels = list(labels)
        self.temperature = float(temperature)
        self.T = T
        self.feature_dim = feature_dim

    @classmethod
    def load(cls, folder) -> "IslModel":
        import onnxruntime as ort  # imported here so the rest of the service works without it

        folder = Path(folder)
        meta = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
        labels = json.loads((folder / "labels.json").read_text(encoding="utf-8"))

        if meta.get("feature_version") != FEATURE_VERSION:
            raise ValueError(
                f"model was trained with feature version {meta.get('feature_version')}, "
                f"this service computes version {FEATURE_VERSION}"
            )
        if meta.get("T") != T_DEFAULT or meta.get("feature_dim") != FEATURE_DIM:
            raise ValueError("model input shape does not match the feature code")
        if len(labels) != meta.get("n_classes"):
            raise ValueError(
                "labels.json and meta.json disagree on the number of classes"
            )

        session = ort.InferenceSession(
            str(folder / "isl50.onnx"), providers=["CPUExecutionProvider"]
        )
        n_out = session.get_outputs()[0].shape[-1]
        if isinstance(n_out, int) and n_out != len(labels):
            raise ValueError(
                "the model has a different number of outputs than there are labels"
            )
        return cls(
            session,
            labels,
            meta.get("temperature", 1.0),
            meta["T"],
            meta["feature_dim"],
        )

    def predict(self, features: np.ndarray, k: int = 3) -> List[Tuple[str, float]]:
        """features [T, FEATURE_DIM] -> the k most likely (label, probability), best first."""
        x = np.asarray(features, dtype=np.float32)[None]
        logits = self._session.run(None, {self._input: x})[0][0].astype(np.float64)
        z = logits / max(self.temperature, 1e-6)
        z -= z.max()
        probs = np.exp(z)
        probs /= probs.sum()
        order = np.argsort(-probs)[:k]
        return [(self.labels[i], float(probs[i])) for i in order]


# ------------------------------------------------------------------- hands and motion
def clean_hands(raw) -> List[np.ndarray]:
    """Whatever the browser sent -> up to two [21, 2] float arrays (bad entries are dropped)."""
    hands: List[np.ndarray] = []
    for h in (raw or [])[:2]:
        try:
            arr = np.asarray(h, dtype=np.float32)
        except (TypeError, ValueError):
            continue
        if (
            arr.ndim == 2
            and arr.shape[0] >= 21
            and arr.shape[1] >= 2
            and np.isfinite(arr[:21, :2]).all()
        ):
            hands.append(arr[:21, :2])
    return hands


def _palm_width(h: np.ndarray) -> float:
    return max(1e-3, float(np.hypot(*(h[5] - h[17]))))


def hand_speed(prev: List[np.ndarray], cur: List[np.ndarray], dt_s: float) -> float:
    """Speed of the fastest hand, in palm widths per second (0 if there is nothing to compare)."""
    if not prev or not cur:
        return 0.0
    dt_s = max(dt_s, 0.02)
    best = 0.0
    for h in cur:
        p = min(prev, key=lambda q: float(np.hypot(*(q[0] - h[0]))))
        if float(np.hypot(*(p[0] - h[0]))) > _SAME_HAND_DIST:
            continue  # that is another hand, not this one moving
        moved = float(np.linalg.norm(h[_TIPS] - p[_TIPS], axis=1).mean())
        best = max(best, moved / _palm_width(h) / dt_s)
    return best


def motion_extent(tracks: np.ndarray) -> float:
    """How far the hands travelled during a clip, in palm widths.

    tracks: [n, 2, 21, 2] (NaN = hand missing), as made by features.assign_tracks. The result is the largest
    x or y range of the wrist or a fingertip of one hand. A hand resting in view scores about 0.1-0.2
    (landmark jitter), a sign several. Unlike a speed it does not depend on the frame rate.
    """
    best = 0.0
    for s in (0, 1):
        hand = tracks[:, s]
        ok = ~np.isnan(hand[:, 0, 0])
        if ok.sum() < 2:
            continue
        h = hand[ok]
        palm = max(
            1e-3,
            float(
                np.median(np.hypot(h[:, 5, 0] - h[:, 17, 0], h[:, 5, 1] - h[:, 17, 1]))
            ),
        )
        pts = h[:, _TIPS, :]
        best = max(best, float((pts.max(axis=0) - pts.min(axis=0)).max()) / palm)
    return best


# ---------------------------------------------------------------------- the segmenter
@dataclass
class Clip:
    frames: List[List[np.ndarray]]  # on a 25 fps grid, [] where no hand was visible
    start_t: float  # the sign itself (without padding), sender clock, ms
    end_t: float
    visible_frames: int
    extent: float = 0.0  # how far the hands travelled, in palm widths


class SignSegmenter:
    """Cuts the hand stream into signs.

    A sign starts when hands have been visible for a moment and ends when
      - the hands have been gone for gap_ms, or
      - they stay in view but have stopped moving for still_ms (after having moved), or
      - it has lasted max_ms (it is cut there).
    A sign that never moved (a resting hand), or that is too short, is thrown away.
    All times are the sender's clock in milliseconds.
    """

    def __init__(self, cfg: EngineConfig):
        self.cfg = cfg
        self._buf: List[Tuple[float, List[np.ndarray]]] = []
        self._last_t: Optional[float] = None
        self._last_hand_t: Optional[float] = None
        self._candidate: Optional[float] = (
            None  # when the current burst of visible hands began
        )
        self._active = False
        self._seg_start = 0.0
        self._seg_frames = 0
        self._moved = False
        self._still_since: Optional[float] = None
        self._speed = 0.0
        self._prev_hands: List[np.ndarray] = []
        self._prev_t = 0.0

    # ---- public --------------------------------------------------------------------
    @property
    def active(self) -> bool:
        return self._active

    def push(self, t_ms: float, hands: List[np.ndarray]) -> List[Clip]:
        """One frame; returns the signs that were completed by it (usually none)."""
        if self._last_t is not None and t_ms < self._last_t:
            return []  # out of order: ignore
        clips: List[Clip] = []

        # the previous burst of hands ended before this frame
        if (
            self._last_hand_t is not None
            and t_ms - self._last_hand_t > self.cfg.isl_gap_ms
        ):
            self._close(clips, end_t=self._last_hand_t)
            self._candidate = None
            self._speed = 0.0
            self._prev_hands = []

        self._last_t = t_ms
        if hands:
            self._buf.append((t_ms, hands))
            self._prune(t_ms)
            self._visible(t_ms, hands, clips)
            self._last_hand_t = t_ms
            self._prev_hands, self._prev_t = hands, t_ms
        return clips

    def poll(self, now_ms: float) -> List[Clip]:
        """Time has passed with no new frames: close a sign whose hands have left."""
        clips: List[Clip] = []
        if (
            self._last_hand_t is not None
            and now_ms - self._last_hand_t >= self.cfg.isl_gap_ms
        ):
            self._close(clips, end_t=self._last_hand_t)
            self._candidate = None
            self._speed = 0.0
            self._prev_hands = []
        return clips

    def flush(self) -> List[Clip]:
        """The call is ending: close a sign in progress right now."""
        clips: List[Clip] = []
        if self._last_hand_t is not None:
            self._close(clips, end_t=self._last_hand_t)
            self._candidate = None
        return clips

    def ms_until_close(self, now_ms: float) -> Optional[float]:
        """When the sender must be polled again: the moment the open sign would be closed for lack of hands."""
        if not self._active or self._last_hand_t is None:
            return None
        return max(0.0, self.cfg.isl_gap_ms - (now_ms - self._last_hand_t))

    # ---- internals -------------------------------------------------------------
    def _visible(self, t_ms: float, hands: List[np.ndarray], clips: List[Clip]) -> None:
        cfg = self.cfg
        if not self._active:
            if self._candidate is None:
                self._candidate = t_ms
            if t_ms - self._candidate >= cfg.isl_start_ms:
                self._active = True
                self._seg_start = self._candidate
                self._seg_frames = 0
                self._moved = False
                self._still_since = None
                self._speed = 0.0

        if not self._active:
            return

        self._seg_frames += 1
        dt = (t_ms - self._prev_t) / 1000.0 if self._prev_hands else 0.0
        speed_now = hand_speed(self._prev_hands, hands, dt)
        self._speed = _EMA * speed_now + (1 - _EMA) * self._speed

        if self._speed >= cfg.isl_move_speed:
            self._moved = True
        if self._speed < cfg.isl_still_speed:
            if self._still_since is None:
                self._still_since = t_ms
        else:
            self._still_since = None

        if t_ms - self._seg_start >= cfg.isl_max_ms:
            self._close(clips, end_t=t_ms)
            self._candidate = t_ms  # keep going: the next part may be another sign
        elif (
            self._moved
            and self._still_since is not None
            and t_ms - self._still_since >= cfg.isl_still_ms
        ):
            self._close(clips, end_t=self._still_since)
            self._candidate = t_ms

    def _close(self, clips: List[Clip], end_t: float) -> None:
        if not self._active:
            return
        cfg = self.cfg
        start_t, frames = self._seg_start, self._seg_frames
        self._active = False
        self._moved = False
        self._still_since = None
        if end_t - start_t < cfg.isl_min_ms or frames < MIN_VISIBLE_FRAMES:
            return
        clips.append(self._make_clip(start_t, end_t, frames))

    def _make_clip(self, start_t: float, end_t: float, visible: int) -> Clip:
        cfg = self.cfg
        t0, t1 = start_t - cfg.isl_lead_ms, end_t + cfg.isl_trail_ms
        times = [f[0] for f in self._buf]
        n = int((t1 - t0) / GRID_MS) + 1
        frames: List[List[np.ndarray]] = []
        for i in range(n):
            tg = t0 + i * GRID_MS
            # inside the sign a missing frame is bridged (up to NEAR_MS); in the padding only a real frame counts
            tol = NEAR_MS if start_t <= tg <= end_t else GRID_MS / 2
            j = bisect.bisect_left(times, tg)
            best = None
            for c in (j - 1, j):
                if 0 <= c < len(times) and abs(times[c] - tg) <= tol:
                    if best is None or abs(times[c] - tg) < abs(times[best] - tg):
                        best = c
            frames.append(list(self._buf[best][1]) if best is not None else [])
        extent = motion_extent(assign_tracks(frames))
        return Clip(
            frames=frames,
            start_t=start_t,
            end_t=end_t,
            visible_frames=visible,
            extent=extent,
        )

    def _prune(self, now_t: float) -> None:
        horizon = now_t - (
            self.cfg.isl_max_ms + self.cfg.isl_lead_ms + self.cfg.isl_trail_ms + 1000.0
        )
        if self._buf and self._buf[0][0] < horizon:
            k = bisect.bisect_left([f[0] for f in self._buf], horizon)
            del self._buf[:k]


# ----------------------------------------------------------------------------- detector
@dataclass
class SignEvent:
    label: str
    confidence: float
    t_ms: float
    top: List[Tuple[str, float]] = field(default_factory=list)


class IslSignDetector:
    """Per-session: hands in, recognized signs out."""

    def __init__(self, model, cfg: EngineConfig):
        self.model = model
        self.cfg = cfg
        self.segmenter = SignSegmenter(cfg)

    def push(self, t_ms: float, raw_hands) -> List[SignEvent]:
        return self._classify(self.segmenter.push(float(t_ms), clean_hands(raw_hands)))

    def poll(self, now_ms: float) -> List[SignEvent]:
        return self._classify(self.segmenter.poll(now_ms))

    def flush(self) -> List[SignEvent]:
        return self._classify(self.segmenter.flush())

    def ms_until_close(self, now_ms: float) -> Optional[float]:
        return self.segmenter.ms_until_close(now_ms)

    def _classify(self, clips: List[Clip]) -> List[SignEvent]:
        events: List[SignEvent] = []
        for clip in clips:
            if clip.extent < self.cfg.isl_min_extent:
                log.info(
                    "hands in view for %.0f ms but they hardly moved (%.2f palm widths): not a sign",
                    clip.end_t - clip.start_t,
                    clip.extent,
                )
                continue
            feats = featurize(clip.frames)
            if feats is None:
                continue
            top = self.model.predict(feats)
            (label, p1), p2 = top[0], (top[1][1] if len(top) > 1 else 0.0)
            dur = clip.end_t - clip.start_t
            accepted = (
                p1 >= self.cfg.isl_accept_prob and (p1 - p2) >= self.cfg.isl_min_margin
            )
            log.info(
                "sign %.0f ms, %d frames, moved %.1f palm widths -> %s %.2f (next %s %.2f) %s",
                dur,
                clip.visible_frames,
                clip.extent,
                label,
                p1,
                top[1][0] if len(top) > 1 else "-",
                p2,
                "ACCEPTED" if accepted else "rejected",
            )
            if accepted:
                events.append(
                    SignEvent(
                        label=label, confidence=round(p1, 3), t_ms=clip.end_t, top=top
                    )
                )
        return events
