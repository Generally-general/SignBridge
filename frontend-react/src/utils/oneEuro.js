// One Euro filter (Casiez et al., 2012): steady when the hand is still, responsive when it moves.
// Time-based, so it behaves the same at 10 fps or 30 fps.
const alphaFor = (cutoff, dt) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

export class OneEuro {
  constructor(minCutoff = 1, beta = 0.007, dCutoff = 1) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.reset();
  }

  reset() {
    this.x = null;
    this.dx = 0;
    this.t = null;
  }

  // value in any unit, t in milliseconds
  filter(value, t) {
    if (this.x === null || this.t === null) {
      this.x = value;
      this.t = t;
      return value;
    }
    const dt = Math.max((t - this.t) / 1000, 1e-3);
    this.t = t;
    const rawD = (value - this.x) / dt;
    this.dx += alphaFor(this.dCutoff, dt) * (rawD - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alphaFor(cutoff, dt) * (value - this.x);
    return this.x;
  }
}