export const BADGE_IDS = [
  "open", "flat", "fist", "point", "peace", "ily",
  "thumbsup", "ok", "three", "call", "rock", "four",
];

export const BADGE_LABELS = {
  open: "Open hand",
  flat: "Flat hand",
  fist: "Fist",
  point: "Point",
  peace: "Peace",
  ily: "I love you",
  thumbsup: "Thumbs up",
  ok: "OK",
  three: "Three",
  call: "Call me",
  rock: "Rock",
  four: "Four",
};

export const COLORS = {
  sky: { bg: "#E0F2FE", fg: "#0369A1" },
  violet: { bg: "#EDE9FE", fg: "#6D28D9" },
  rose: { bg: "#FFE4E6", fg: "#BE123C" },
  amber: { bg: "#FEF3C7", fg: "#B45309" },
  emerald: { bg: "#D1FAE5", fg: "#047857" },
  teal: { bg: "#CCFBF1", fg: "#0F766E" },
  orange: { bg: "#FFEDD5", fg: "#C2410C" },
  slate: { bg: "#E2E8F0", fg: "#334155" },
};
export const COLOR_IDS = Object.keys(COLORS);

export const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

// Digits out (1) or folded (0): thumb, index, middle, ring, pinky.
const SHAPES = {
  open: [1, 1, 1, 1, 1],
  flat: [1, 1, 1, 1, 1],
  fist: [0, 0, 0, 0, 0],
  point: [0, 1, 0, 0, 0],
  peace: [0, 1, 1, 0, 0],
  ily: [1, 1, 0, 0, 1],
  thumbsup: [1, 0, 0, 0, 0],
  ok: [1, 1, 1, 1, 1],
  three: [0, 1, 1, 1, 0],
  call: [1, 0, 0, 0, 1],
  rock: [0, 1, 0, 0, 1],
  four: [0, 1, 1, 1, 1],
};

const BASES = [
  [-0.62, 0.42],
  [-0.3, 0.95],
  [-0.05, 1.02],
  [0.2, 0.97],
  [0.42, 0.84],
];
const LENGTHS = [
  [0.36, 0.3, 0.26],
  [0.4, 0.26, 0.22],
  [0.44, 0.28, 0.23],
  [0.4, 0.26, 0.21],
  [0.32, 0.2, 0.18],
];

const walk = (start, angle, lens, flex) => {
  const pts = [];
  let [x, y] = start;
  let a = angle;
  for (let i = 0; i < lens.length; i += 1) {
    a += flex[i] || 0;
    x += Math.sin(a) * lens[i];
    y += Math.cos(a) * lens[i];
    pts.push([x, y]);
  }
  return pts;
};

export function handPoints(id) {
  const shape = SHAPES[id] || SHAPES.open;
  const flat = id === "flat";
  const pts = new Array(21);
  pts[0] = [0, 0];

  pts[1] = [-0.3, 0.2];
  pts[2] = BASES[0];
  if (shape[0]) {
    const up = id === "thumbsup";
    const angle = up ? -0.15 : -0.95;
    const t = walk(BASES[0], angle, [LENGTHS[0][0], LENGTHS[0][1]], [0, 0.1]);
    pts[3] = t[0];
    pts[4] = t[1];
  } else {
    const t = walk(BASES[0], 0.9, [0.3, 0.25], [0, 0.9]);
    pts[3] = t[0];
    pts[4] = t[1];
  }

  const spread = flat ? [0, 0, 0, 0] : [-0.16, -0.04, 0.08, 0.2];
  for (let f = 1; f <= 4; f += 1) {
    const base = BASES[f];
    const first = 1 + f * 4;
    pts[first] = base;
    // A folded finger is drawn as a short stub (it curls toward the viewer).
    const flex = shape[f] ? [0, 0.04, 0.04] : [0.5, 0.9, 0.9];
    const lens = shape[f] ? LENGTHS[f] : LENGTHS[f].map((l) => l * 0.45);
    const finger = walk(base, spread[f - 1] * 0.5, lens, flex);
    pts[first + 1] = finger[0];
    pts[first + 2] = finger[1];
    pts[first + 3] = finger[2];
  }

  if (id === "ok") {
    const flex = [0.7, 1.2, 0.9];
    const finger = walk(BASES[1], -0.16, LENGTHS[1], flex);
    pts[6] = finger[0];
    pts[7] = finger[1];
    pts[8] = finger[2];
    pts[3] = [(pts[2][0] + pts[8][0]) / 2, (pts[2][1] + pts[8][1]) / 2];
    pts[4] = pts[8];
  }
  return pts;
}

// Normalised for an SVG viewBox "0 0 100 100": flips y and centres the hand.
export function handToSvg(id) {
  const raw = handPoints(id);
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const k = 76 / size;
  const ox = 50 - ((minX + maxX) / 2) * k;
  const oy = 50 + ((minY + maxY) / 2) * k;
  return raw.map(([x, y]) => [ox + x * k, oy - y * k]);
}