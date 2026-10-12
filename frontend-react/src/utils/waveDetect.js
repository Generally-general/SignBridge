// A wave is an open hand swinging side to side: several direction reversals, each a real swing.
// Pure functions so they can be tested without a camera.

const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Samples are { t, x } in time order. A reversal is counted when the hand has travelled at least
// `minTravel` back the other way from the last extreme, so jitter and slow drift never count.
export const countReversals = (samples, minTravel) => {
  if (samples.length < 3) return 0;
  let dir = 0; // +1 moving right, -1 moving left, 0 undecided
  let extreme = samples[0].x;
  let reversals = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const x = samples[i].x;
    if (dir === 0) {
      if (Math.abs(x - extreme) >= minTravel) {
        dir = x > extreme ? 1 : -1;
        extreme = x;
      }
    } else if (dir === 1) {
      if (x > extreme) extreme = x;
      else if (extreme - x >= minTravel) {
        dir = -1;
        extreme = x;
        reversals += 1;
      }
    } else if (x < extreme) {
      extreme = x;
    } else if (x - extreme >= minTravel) {
      dir = 1;
      extreme = x;
      reversals += 1;
    }
  }
  return reversals;
};

// Middle, ring and pinky fingertips clearly farther from the wrist than their knuckles.
export const isOpenHand = (lm) => {
  const ext = (mcp, tip) => {
    const base = dist2(lm[0], lm[mcp]);
    return base ? dist2(lm[0], lm[tip]) / base : 0;
  };
  return ext(9, 12) > 1.5 && ext(13, 16) > 1.5 && ext(17, 20) > 1.4;
};