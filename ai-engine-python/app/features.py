"""Hand-keypoint features for isolated sign recognition.

Hands only, x/y only, up to two hands. The SAME module is used to build the
training set (Colab notebook) and to featurize live segments (AI service), so
training and serving cannot drift apart. Pure numpy.

Input  : a list with one entry per video frame; each entry is a list of 0..2
         hands, each hand an array [21, 2 or 3] of normalized image coordinates
         (MediaPipe Hands order). Only x and y are used.
Output : array [T, FEATURE_DIM], float32, no NaN/inf.

Position in the frame is deliberately NOT used (it depends on camera framing
and distance). What is kept: hand shape, the motion of each hand relative to
where the sign started, and the relative position of the two hands.
"""
import numpy as np

FEATURE_VERSION = 1
N_LM = 21
WRIST, INDEX_MCP, PINKY_MCP = 0, 5, 17
T_DEFAULT = 32
FEATURE_DIM = 258  # see featurize_tracks()

_JUMP = 0.30  # a wrist further than this from the known track is treated as the other hand


def frames_from_array(arr):
    """Inverse of the storage format: arr [n, 2, 21, 2] with NaN for missing hands."""
    arr = np.asarray(arr, dtype=np.float32)
    frames = []
    for i in range(arr.shape[0]):
        hands = [arr[i, j] for j in range(arr.shape[1]) if not np.isnan(arr[i, j]).any()]
        frames.append(hands)
    return frames


# ---------------------------------------------------------------- tracking
def _dist(a, b):
    return float(np.hypot(a[0] - b[0], a[1] - b[1]))


def assign_tracks(frames):
    """Follow the (up to two) hands through the sequence.

    Returns tracks [n, 2, 21, 2] with NaN where a hand is missing. A hand keeps
    its slot from frame to frame (nearest wrist). Afterwards slot 0 is the hand
    that moves more (the active/dominant hand), so right- and left-handed
    signers produce the same layout and no handedness label is needed.
    """
    n = len(frames)
    tracks = np.full((n, 2, N_LM, 2), np.nan, dtype=np.float32)
    last = [None, None]  # last wrist position per slot

    for i, hands in enumerate(frames):
        hs = [np.asarray(h, dtype=np.float32)[:, :2] for h in (hands or [])][:2]
        if not hs:
            continue
        if len(hs) == 1:
            h = hs[0]
            w = h[WRIST]
            known = [s for s in (0, 1) if last[s] is not None]
            if not known:
                slot = 0
            elif len(known) == 1:
                s = known[0]
                slot = s if _dist(w, last[s]) < _JUMP else 1 - s
            else:
                slot = 0 if _dist(w, last[0]) <= _dist(w, last[1]) else 1
            tracks[i, slot] = h
            last[slot] = w
        else:
            a, b = hs
            if last[0] is None and last[1] is None:
                order = (a, b) if a[WRIST, 0] <= b[WRIST, 0] else (b, a)
            else:
                def cost(x, s):
                    return 0.0 if last[s] is None else _dist(x[WRIST], last[s])
                straight = cost(a, 0) + cost(b, 1)
                swapped = cost(b, 0) + cost(a, 1)
                order = (a, b) if straight <= swapped else (b, a)
            for s, h in enumerate(order):
                tracks[i, s] = h
                last[s] = h[WRIST]

    # slot 0 = the more active hand
    def path(slot):
        w = tracks[:, slot, WRIST, :]
        ok = ~np.isnan(w).any(axis=1)
        w = w[ok]
        if len(w) < 2:
            return 0.0
        d = np.diff(w, axis=0)
        return float(np.sum(np.hypot(d[:, 0], d[:, 1])))

    if path(1) > path(0):
        tracks = tracks[:, ::-1].copy()
    return tracks


# ----------------------------------------------------------- preprocessing
def _interp_nan(x):
    """Linearly fill NaN along axis 0 (x: [n, ...]); a fully missing series stays NaN."""
    n = x.shape[0]
    flat = x.reshape(n, -1).copy()
    t = np.arange(n)
    for c in range(flat.shape[1]):
        col = flat[:, c]
        ok = ~np.isnan(col)
        if ok.all() or not ok.any():
            continue
        flat[:, c] = np.interp(t, t[ok], col[ok])
    return flat.reshape(x.shape)


def _resample(x, T):
    """Linear resample along axis 0 to T steps. x: [n, ...] with no NaN."""
    n = x.shape[0]
    if n == 1:
        return np.repeat(x, T, axis=0)
    src = np.linspace(0, n - 1, T)
    flat = x.reshape(n, -1)
    out = np.empty((T, flat.shape[1]), dtype=np.float32)
    grid = np.arange(n)
    for c in range(flat.shape[1]):
        out[:, c] = np.interp(src, grid, flat[:, c])
    return out.reshape((T,) + x.shape[1:])


def featurize_tracks(tracks, T=T_DEFAULT):
    """tracks [n, 2, 21, 2] (NaN = missing) -> [T, FEATURE_DIM], or None if no hand at all."""
    tracks = np.asarray(tracks, dtype=np.float32)
    n = tracks.shape[0]
    if n == 0:
        return None
    present = ~np.isnan(tracks[:, :, WRIST, 0])  # [n, 2]
    if not present.any():
        return None

    # scale: median palm width over all visible hand-frames
    widths = []
    for s in (0, 1):
        for i in np.where(present[:, s])[0]:
            widths.append(_dist(tracks[i, s, INDEX_MCP], tracks[i, s, PINKY_MCP]))
    scale = float(np.median(widths)) if widths else 0.0
    if scale < 1e-4:
        scale = 1e-4

    # origin: mean wrist of the primary hand (slot 0), else of slot 1
    origin = None
    for s in (0, 1):
        if present[:, s].any():
            origin = np.nanmean(tracks[present[:, s], s, WRIST, :], axis=0)
            break

    g = (tracks - origin[None, None, None, :]) / scale  # global (sequence-relative)
    wrist = g[:, :, WRIST:WRIST + 1, :]
    local = g - wrist                                   # hand shape, position-free

    g = _interp_nan(g)
    local = _interp_nan(local)
    pres = present.astype(np.float32)

    g = np.nan_to_num(_resample(g, T), nan=0.0)
    local = np.nan_to_num(_resample(local, T), nan=0.0)
    pres_r = _resample(pres[:, :, None], T)[:, :, 0]
    pres_r = (pres_r > 0.5).astype(np.float32)

    # zero out hands that are absent in a resampled step
    g = g * pres_r[:, :, None, None]
    local = local * pres_r[:, :, None, None]

    both = (pres_r[:, 0] * pres_r[:, 1])[:, None]
    delta = (g[:, 1, WRIST, :] - g[:, 0, WRIST, :]) * both   # inter-hand wrist offset

    g_flat = g.reshape(T, 2, -1)         # [T, 2, 42]
    l_flat = local.reshape(T, 2, -1)
    pos = np.concatenate([g_flat[:, 0], g_flat[:, 1], delta], axis=1)  # 42+42+2 = 86
    vel = np.diff(pos, axis=0, prepend=pos[:1])
    feat = np.concatenate(
        [g_flat[:, 0], g_flat[:, 1], l_flat[:, 0], l_flat[:, 1], pres_r, delta, vel], axis=1
    )
    assert feat.shape == (T, FEATURE_DIM), feat.shape
    return np.clip(np.nan_to_num(feat, nan=0.0, posinf=0.0, neginf=0.0), -20, 20).astype(np.float32)


def featurize(frames, T=T_DEFAULT):
    """frames (list of per-frame hand lists) -> [T, FEATURE_DIM] or None."""
    return featurize_tracks(assign_tracks(frames), T)


# ------------------------------------------------------------- augmentation
def augment_tracks(tracks, rng):
    """Random, label-preserving perturbation of a [n, 2, 21, 2] track array."""
    t = np.array(tracks, dtype=np.float32, copy=True)
    n = t.shape[0]

    # mirror (left/right-handed signers)
    if rng.random() < 0.5:
        t[..., 0] = 1.0 - t[..., 0]

    # small rotation + scale around the sequence centre
    ang = np.deg2rad(rng.uniform(-12, 12))
    sc = rng.uniform(0.85, 1.15)
    centre = np.nanmean(t.reshape(-1, 2), axis=0)
    rot = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]], dtype=np.float32)
    t = ((t - centre) @ rot.T) * sc + centre

    # landmark noise
    t += rng.normal(0, 0.003, size=t.shape).astype(np.float32)

    # speed change: resample the time axis (0.8x - 1.25x); missing frames stay missing
    speed = rng.uniform(0.8, 1.25)
    m = max(2, int(round(n / speed)))
    if n >= 2 and m != n:
        flat = t.reshape(n, -1)
        src = np.linspace(0, n - 1, m)
        grid = np.arange(n)
        out = np.empty((m, flat.shape[1]), dtype=np.float32)
        for c in range(flat.shape[1]):
            col = flat[:, c]
            ok = ~np.isnan(col)
            out[:, c] = np.interp(src, grid[ok], col[ok]) if ok.sum() >= 2 else np.nan
        nearest = np.clip(np.round(src).astype(int), 0, n - 1)
        out[np.isnan(flat[nearest])] = np.nan
        t = out.reshape((m,) + t.shape[1:])
        n = m

    # randomly dropped frames (tracking glitches)
    t[rng.random(n) < 0.05] = np.nan
    return t
