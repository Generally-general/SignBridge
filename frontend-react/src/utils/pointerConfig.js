// Hand-pointer tunables. All values are initial engineering choices, not measured:
// they need a pass on real cameras before any number goes in the paper.
export const POINTER_CONFIG = {
  // Part of the camera frame (0..1, after mirroring) that maps to the whole screen.
  REGION: { x0: 0.2, x1: 0.8, y0: 0.1, y1: 0.7 },

  // One Euro filter on the cursor: lower cutoff = steadier, higher beta = less lag on fast moves.
  FILTER_MIN_CUTOFF: 1.2,
  FILTER_BETA: 0.01,
  FILTER_D_CUTOFF: 1,

  // Thumb-index distance / palm width, with hysteresis (same idea as pinch-scroll).
  PINCH_ENGAGE: 0.35,
  PINCH_RELEASE: 0.5,

  CLICK_MAX_MS: 800, // a pinch held longer than this is not a click
  CLICK_DRIFT_PX: 40, // and neither is one where the hand moved this far

  SCROLL_ARM_PX: 16, // vertical travel while pinched that starts a scroll
  SCROLL_GAIN: 1.2, // scroll pixels per cursor pixel

  DWELL_MS: 700,
  LOST_MS: 300, // hide the cursor when the hand has been missing this long
  LATCH_IDLE_MS: 8000, // latched mode switches off after this long with no hand

  WAVE_WINDOW_MS: 2000,
  WAVE_MIN_REVERSALS: 4, // direction changes inside the window
  WAVE_MIN_TRAVEL_PALM: 0.6, // each swing at least this many palm widths
  WAVE_COOLDOWN_MS: 10000,
};