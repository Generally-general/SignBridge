// What the browser sends for translation.
//
//   hands  up to two hands, 21 points each, x and y only, rounded to 4 decimals
//          (about 0.1 pixel on a 1080p frame) - used by the word-level recognizer
//   first  the first hand again in the old x, y, z format - used by the static-pose recognizer
//
// Together that is roughly 0.9-1.2 KB per frame, less than the 1.35 KB the first hand alone used to take.

const round4 = (v) => Math.round(v * 10000) / 10000;

export const buildHandPayload = (results) => {
  const raw = results?.multiHandLandmarks ?? [];
  const hands = raw.slice(0, 2).map((hand) => hand.map((p) => [round4(p.x), round4(p.y)]));
  const first = raw[0] ? raw[0].map((p) => [round4(p.x), round4(p.y), round4(p.z ?? 0)]) : null;
  return { hands, first };
};