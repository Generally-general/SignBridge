// Compact binary format for the skeleton-mode data channel.
//
//   byte 0      bits 0-1: number of hands (0, 1 or 2); bit 2: an upper-body pose follows
//   bytes 1-2   frame number (uint16, wraps) - lets the receiver drop late frames
//   per hand    21 points x (x, y) as int16 = x or y * 10000 (0.0001 precision) = 84 bytes
//   pose        13 points x (x int16, y int16, visibility uint8 0-255) = 65 bytes, only in
//               frames that carry a fresh pose result (the pose runs slower than the hands)
//   face        bit 3 of byte 0. 66 face points, stored relative to their own bounding box:
//               box centre x, y (int16) and box width, height (uint16), all * 10000, then each
//               point as two int8 = offset / box size * 250. 8 + 284 = 292 bytes.
//
// A frame with two hands, a pose and a face is 3 + 2 * 84 + 65 + 140 = 376 bytes.

export const HAND_POINTS = 21;
export const MAX_HANDS = 2;

// The pose points that are sent, as indices into MediaPipe's 33-point body model.
// Order here is the order on the wire: nose, eyes, ears, mouth, shoulders, elbows, wrists.
export const POSE_SOURCE_IDS = [0, 2, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
export const POSE_POINTS = POSE_SOURCE_IDS.length;
export const P = {
  NOSE: 0, L_EYE: 1, R_EYE: 2, L_EAR: 3, R_EAR: 4, MOUTH_L: 5, MOUTH_R: 6,
  L_SHOULDER: 7, R_SHOULDER: 8, L_ELBOW: 9, R_ELBOW: 10, L_WRIST: 11, R_WRIST: 12,
};

// Face points (indices into MediaPipe's 468-point face mesh), grouped so the receiver can draw them.
// Every group follows its contour in order, so the receiver can join the points into smooth curves:
//   0-35 face outline (closed), 36-51 and 52-67 the two eyes (closed), 68-77 and 78-87 the two
//   eyebrows (closed), 88-107 outer lips (closed), 108-127 inner lips (closed),
//   128-134 nose bridge down to the tip (open), 135-141 nose base with the nostril wings (open)
export const FACE_SOURCE_IDS = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
  263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249,
  33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7,
  276, 283, 282, 295, 285, 336, 296, 334, 293, 300,
  46, 53, 52, 65, 55, 107, 66, 105, 63, 70,
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146,
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
  168, 6, 197, 195, 5, 4, 1,
  129, 98, 97, 2, 326, 327, 358,
];
export const FACE_POINTS = FACE_SOURCE_IDS.length;
export const FACE_PARTS = {
  OVAL: [0, 36, true],
  EYE_A: [36, 52, true],
  EYE_B: [52, 68, true],
  BROW_A: [68, 78, true],
  BROW_B: [78, 88, true],
  LIPS_OUTER: [88, 108, true],
  LIPS_INNER: [108, 128, true],
  NOSE_BRIDGE: [128, 135, false],
  NOSE_BASE: [135, 142, false],
};
export const FACE_CHIN = 18; // outline point at the chin
export const FACE_SIDE_A = 8; // outline points at the two sides of the face (for sizing)
export const FACE_SIDE_B = 28;
export const FACE_NOSE_TIP = 134;

const SCALE = 10000;
const HAND_BYTES = HAND_POINTS * 2 * 2;
const POSE_BYTES = POSE_POINTS * 5;
const POSE_FLAG = 4;
const FACE_FLAG = 8;
const FACE_HEADER = 8;
const FACE_BYTES = FACE_HEADER + FACE_POINTS * 2;
const FACE_UNIT = 250; // int8 steps per box size; offsets stay within +-0.5

const q = (v) => Math.max(-32767, Math.min(32767, Math.round(v * SCALE)));

// pose: null, or an array of 13 [x, y, visibility 0..1]
// face: null, or an array of 66 [x, y]
export const encodeFrame = (seq, hands, pose = null, face = null) => {
  const list = (hands || [])
    .filter((h) => Array.isArray(h) && h.length === HAND_POINTS)
    .slice(0, MAX_HANDS);
  const withPose = Array.isArray(pose) && pose.length === POSE_POINTS;
  const withFace = Array.isArray(face) && face.length === FACE_POINTS;
  const buf = new ArrayBuffer(
    3 + list.length * HAND_BYTES + (withPose ? POSE_BYTES : 0) + (withFace ? FACE_BYTES : 0),
  );
  const dv = new DataView(buf);
  dv.setUint8(0, list.length | (withPose ? POSE_FLAG : 0) | (withFace ? FACE_FLAG : 0));
  dv.setUint16(1, seq & 0xffff);
  let o = 3;
  for (const hand of list) {
    for (const p of hand) {
      dv.setInt16(o, q(p[0]));
      dv.setInt16(o + 2, q(p[1]));
      o += 4;
    }
  }
  if (withPose) {
    for (const p of pose) {
      dv.setInt16(o, q(p[0]));
      dv.setInt16(o + 2, q(p[1]));
      dv.setUint8(o + 4, Math.max(0, Math.min(255, Math.round((p[2] ?? 0) * 255))));
      o += 5;
    }
  }
  if (withFace) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of face) {
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const w = Math.max(x1 - x0, 1e-4);
    const h = Math.max(y1 - y0, 1e-4);
    dv.setInt16(o, q(cx));
    dv.setInt16(o + 2, q(cy));
    dv.setUint16(o + 4, Math.min(65535, Math.round(w * SCALE)));
    dv.setUint16(o + 6, Math.min(65535, Math.round(h * SCALE)));
    o += FACE_HEADER;
    const off = (v) => Math.max(-127, Math.min(127, Math.round(v * FACE_UNIT)));
    for (const p of face) {
      dv.setInt8(o, off((p[0] - cx) / w));
      dv.setInt8(o + 1, off((p[1] - cy) / h));
      o += 2;
    }
  }
  return buf;
};

// Returns { seq, hands, pose, face } (pose/face are null when the frame has none) or null for
// anything malformed (the peer is untrusted).
export const decodeFrame = (buf) => {
  if (!(buf instanceof ArrayBuffer) || buf.byteLength < 3) return null;
  const dv = new DataView(buf);
  const flags = dv.getUint8(0);
  if (flags & ~(3 | POSE_FLAG | FACE_FLAG)) return null;
  const n = flags & 3;
  const hasPose = (flags & POSE_FLAG) !== 0;
  const hasFace = (flags & FACE_FLAG) !== 0;
  if (n > MAX_HANDS) return null;
  if (
    buf.byteLength !==
    3 + n * HAND_BYTES + (hasPose ? POSE_BYTES : 0) + (hasFace ? FACE_BYTES : 0)
  )
    return null;
  const hands = [];
  let o = 3;
  for (let h = 0; h < n; h++) {
    const pts = [];
    for (let i = 0; i < HAND_POINTS; i++) {
      pts.push([dv.getInt16(o) / SCALE, dv.getInt16(o + 2) / SCALE]);
      o += 4;
    }
    hands.push(pts);
  }
  let pose = null;
  if (hasPose) {
    pose = [];
    for (let i = 0; i < POSE_POINTS; i++) {
      pose.push([dv.getInt16(o) / SCALE, dv.getInt16(o + 2) / SCALE, dv.getUint8(o + 4) / 255]);
      o += 5;
    }
  }
  let face = null;
  if (hasFace) {
    const cx = dv.getInt16(o) / SCALE;
    const cy = dv.getInt16(o + 2) / SCALE;
    const w = dv.getUint16(o + 4) / SCALE;
    const h = dv.getUint16(o + 6) / SCALE;
    o += FACE_HEADER;
    face = [];
    for (let i = 0; i < FACE_POINTS; i++) {
      face.push([cx + (dv.getInt8(o) / FACE_UNIT) * w, cy + (dv.getInt8(o + 1) / FACE_UNIT) * h]);
      o += 2;
    }
  }
  return { seq: dv.getUint16(1), hands, pose, face };
};

// True when `seq` is newer than `last` (16-bit wrap-around).
export const isNewer = (seq, last) =>
  last < 0 || (seq !== last && ((seq - last) & 0xffff) < 0x8000);