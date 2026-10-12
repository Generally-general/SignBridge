// Spatial Touch tunable parameters.
//
// PAPER-SPECIFIED: AIR_TAP_VELOCITY_THRESHOLD = 0.15 (gamma, image-plane
// units per frame). Measured on this pipeline it was never reached by a
// deliberate tap, and it depends on hand distance, so it is kept only for the
// paper-literal condition (AIR_TAP_VELOCITY_UNITS = "image").
//
// PILOT-DERIVED INITIAL VALUES (marked "pilot"): chosen from recorded traces of
// one user on one laptop camera at ~16 fps. They are NOT validated; they exist
// so the controlled trials in the debug panel have something sensible to test.
//
// Everything else is an engineering parameter the paper does not specify.

export const SPATIAL_TOUCH_CONFIG = {
  // ===== Air-Tap definition (evaluated head to head) =====
  // "velocity": fast fingertip excursion that returns to its pre-motion origin
  // "pinch":    quick thumb-index close and reopen without drag
  AIR_TAP_MODE: "velocity",
  // "palm": velocity divided by palm width (distance-invariant)
  // "image": paper-literal image-plane units per frame
  AIR_TAP_VELOCITY_UNITS: "palm",

  // ----- velocity mode -----
  AIR_TAP_VELOCITY_THRESHOLD: 0.15, // paper gamma, "image" units
  AIR_TAP_VELOCITY_THRESHOLD_PALM: 0.8, // pilot: between signing p99 (0.64) and bend-click peaks (~0.9+)
  AIR_TAP_REST_VELOCITY_PALM: 0.15, // below this the fingertip counts as at rest (finds the pre-motion origin)
  AIR_TAP_MIN_EXCURSION_PALM: 0.8, // pilot: the fingertip must travel at least this far (palm widths) from its origin
  AIR_TAP_RETURN_RADIUS_PALM: 0.5, // pilot: and come back within this distance of the origin
  AIR_TAP_MIN_ACTIVE_MS: 40,
  AIR_TAP_MAX_ACTIVE_MS: 400, // pilot: at ~16 fps a 250 ms window is only ~4 frames
  AIR_TAP_COOLDOWN_MS: 600,
  NOMINAL_FRAME_MS: 1000 / 30, // defines "per frame" so units are comparable across frame rates
  VELOCITY_SMOOTHING_MS: 100, // time-window smoothing (frame-rate independent)

  // ----- pinch-tap mode -----
  PINCH_TAP_OPEN_FROM: 1.0, // pilot: pinch distance (palm-normalised) must have been at least this open...
  PINCH_TAP_CLOSE_WINDOW_MS: 250, // ...within this long before the close
  PINCH_TAP_MIN_MS: 30,
  PINCH_TAP_MAX_MS: 400, // pilot: closed for longer than this is a held shape, not a tap
  PINCH_TAP_MAX_DRIFT_PALM: 0.6, // pilot: hand may not travel more than this while pinched

  // ===== Pinch-and-scroll =====
  PINCH_ENGAGE_THRESHOLD: 0.35, // thumb-index distance / palm width
  PINCH_RELEASE_THRESHOLD: 0.5, // hysteresis: higher than engage
  PINCH_DRAG_MIN_DELTA: 0.02, // vertical travel (image units) that turns a pinch into a drag
  PINCH_DRAG_ARM_MS: 0, // optional dwell before a drag may start (0 = off; replay showed it doesn't remove the signing false trigger)
  PINCH_DRAG_DEADZONE: 0.004, // per-update movement below this is jitter, not scroll
  PINCH_DRAG_IDLE_MS: 700, // a drag with no movement for this long ends, and cannot restart until the pinch is released
  SCROLL_PIXELS_PER_UNIT: 800,

  // ===== Tracking loss =====
  MAX_MISSED_MS: 400,

  AIR_TAP_ENABLED: false,
};

// ---------------------------------------------------------------------------
// Debug / calibration support (used by SpatialTouchDebugHud)
// ---------------------------------------------------------------------------
export const SPATIAL_TOUCH_DEFAULTS = Object.freeze({ ...SPATIAL_TOUCH_CONFIG });

export const isSpatialDebugEnabled = () => {
  try {
    return (
      new URLSearchParams(window.location.search).get("stdebug") === "1" ||
      localStorage.getItem("signbridge_st_debug") === "1"
    );
  } catch {
    return false;
  }
};

const OVERRIDES_KEY = "signbridge_spatial_overrides";

export const saveSpatialOverrides = () => {
  const diff = {};
  Object.keys(SPATIAL_TOUCH_DEFAULTS).forEach((k) => {
    if (SPATIAL_TOUCH_CONFIG[k] !== SPATIAL_TOUCH_DEFAULTS[k]) {
      diff[k] = SPATIAL_TOUCH_CONFIG[k];
    }
  });
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(diff));
  } catch {
    /* ignore */
  }
};

export const resetSpatialOverrides = () => {
  Object.assign(SPATIAL_TOUCH_CONFIG, SPATIAL_TOUCH_DEFAULTS);
  try {
    localStorage.removeItem(OVERRIDES_KEY);
  } catch {
    /* ignore */
  }
};

// Saved overrides only apply while the debug panel is enabled, so normal use
// always runs the documented defaults.
if (isSpatialDebugEnabled()) {
  try {
    const saved = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
    Object.keys(saved).forEach((k) => {
      if (
        k in SPATIAL_TOUCH_DEFAULTS &&
        typeof saved[k] === typeof SPATIAL_TOUCH_DEFAULTS[k] &&
        (typeof saved[k] !== "number" || Number.isFinite(saved[k]))
      ) {
        SPATIAL_TOUCH_CONFIG[k] = saved[k];
      }
    });
  } catch {
    /* ignore corrupt overrides */
  }
}