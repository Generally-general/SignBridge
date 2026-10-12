import { useCallback, useRef } from "react";
import { SPATIAL_TOUCH_CONFIG as CFG } from "../utils/spatialTouchConfig";
import { distance2D, palmWidth } from "../utils/spatialTouchGeometry";

// MediaPipe Hands landmark indices (same as gesture.py).
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_TIP = 20;

const HISTORY_MS = 800;

const STATES = {
  IDLE: "IDLE",
  TAP_CANDIDATE: "TAP_CANDIDATE",
  COOLDOWN: "COOLDOWN",
  PINCH_HOLD: "PINCH_HOLD",
  PINCH_DRAG: "PINCH_DRAG",
};

const r2 = (v) => Math.round(v * 1e2) / 1e2;
const r4 = (v) => Math.round(v * 1e4) / 1e4;

// How far a finger tip is from the wrist relative to its knuckle (>~1.5 = extended).
const extension = (lm, mcp, tip) => {
  const base = distance2D(lm[WRIST], lm[mcp]);
  return base ? distance2D(lm[WRIST], lm[tip]) / base : 0;
};

/**
 * Client-side Spatial Touch state machine (see spatialTouchConfig.js).
 *
 * Air-Tap has two selectable definitions (CFG.AIR_TAP_MODE):
 *  - "velocity": a fast fingertip excursion that RETURNS to the position it
 *    had before the motion started. A sign transition ends somewhere else, so
 *    it is rejected.
 *  - "pinch": a quick thumb-index close and reopen, without dragging.
 *
 * Smoothing and tracking-loss timeouts are time-based because the measured
 * processing rate is ~16 fps and varies.
 */
export const useSpatialTouch = ({
  onAirTap,
  onPinchStart,
  onPinchMove,
  onPinchEnd,
  onTelemetryEvent,
  onFrameSample,
} = {}) => {
  const state = useRef(STATES.IDLE);
  const missStart = useRef(null);
  const lastTip = useRef(null); // { x, y, t }
  const velocitySamples = useRef([]); // { t, v }
  const history = useRef([]); // { t, x, y, ivp, pinch }
  const tap = useRef(null); // { t, ox, oy, maxExc }
  const hold = useRef(null); // { t, x, y, pw, tapEligible, locked, lastMoveAt }
  const cooldownUntil = useRef(0);
  const pinchDragLastY = useRef(null);
  const lastFrameT = useRef(null);
  const fpsEma = useRef(0);
  const peak = useRef({ value: 0, at: 0 });
  const metricsRef = useRef({
    state: STATES.IDLE,
    handPresent: false,
    handedness: null,
    velocity: 0,
    peakVelocity: 0,
    pinchDist: null,
    fps: 0,
  });

  const callbacksRef = useRef({});
  callbacksRef.current = {
    onAirTap,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    onTelemetryEvent,
    onFrameSample,
  };

  const emitTelemetry = (type, data) => {
    callbacksRef.current.onTelemetryEvent?.({
      type,
      timestamp: Date.now(),
      mode: CFG.AIR_TAP_MODE,
      ...data,
    });
  };

  const resetToIdle = (reason) => {
    // Only a pinch that actually started dragging has a matching PINCH_START.
    if (state.current === STATES.PINCH_DRAG) {
      callbacksRef.current.onPinchEnd?.();
      emitTelemetry("PINCH_END", { reason });
    }
    state.current = STATES.IDLE;
    tap.current = null;
    hold.current = null;
    lastTip.current = null;
    velocitySamples.current = [];
    history.current = [];
    pinchDragLastY.current = null;
    lastFrameT.current = null;
  };

  const fireAirTap = (now, data) => {
    callbacksRef.current.onAirTap?.();
    emitTelemetry("AIR_TAP", data);
    state.current = STATES.COOLDOWN;
    cooldownUntil.current = now + CFG.AIR_TAP_COOLDOWN_MS;
  };

  const processFrame = useCallback((landmarks, meta) => {
    const now = performance.now();
    const m = metricsRef.current;

    if (!landmarks) {
      m.handPresent = false;
      if (missStart.current === null) missStart.current = now;
      if (now - missStart.current > CFG.MAX_MISSED_MS) {
        resetToIdle("hand_lost");
      }
      m.state = state.current;
      return;
    }
    missStart.current = null;
    m.handPresent = true;
    m.handedness = meta?.handedness ?? null;

    const indexTip = landmarks[INDEX_TIP];
    const thumbTip = landmarks[THUMB_TIP];
    const pw = palmWidth(landmarks[INDEX_MCP], landmarks[PINKY_MCP]);
    if (!pw) return; // degenerate frame, mirrors gesture.py's palm_width guard

    // --- frame rate (display/analysis only) ---
    let frameDt = 0;
    if (lastFrameT.current !== null) {
      frameDt = now - lastFrameT.current;
      if (frameDt > 0) {
        const inst = 1000 / frameDt;
        fpsEma.current = fpsEma.current ? 0.9 * fpsEma.current + 0.1 * inst : inst;
      }
    }
    lastFrameT.current = now;

    // --- fingertip velocity ---
    // instImage: image-plane units per nominal frame (paper-literal).
    // instPalm:  the same divided by palm width (distance-invariant).
    let instImage = 0;
    if (lastTip.current) {
      const dt = now - lastTip.current.t;
      if (dt > 0) {
        instImage = (distance2D(lastTip.current, indexTip) / dt) * CFG.NOMINAL_FRAME_MS;
      }
    }
    lastTip.current = { x: indexTip[0], y: indexTip[1], t: now };
    const instPalm = instImage / pw;
    const usePalm = CFG.AIR_TAP_VELOCITY_UNITS === "palm";
    const gamma = usePalm
      ? CFG.AIR_TAP_VELOCITY_THRESHOLD_PALM
      : CFG.AIR_TAP_VELOCITY_THRESHOLD;

    velocitySamples.current.push({ t: now, v: usePalm ? instPalm : instImage });
    const cutoff = now - CFG.VELOCITY_SMOOTHING_MS;
    const samples = velocitySamples.current;
    while (samples.length > 1 && samples[0].t < cutoff) samples.shift();
    const smoothedVelocity = samples.reduce((a, s) => a + s.v, 0) / samples.length;

    // --- pinch distance, normalised by palm width ---
    const pinchDist = distance2D(thumbTip, indexTip) / pw;

    // --- short history (used for the pre-motion origin and pinch-open check) ---
    history.current.push({ t: now, x: indexTip[0], y: indexTip[1], ivp: instPalm, pinch: pinchDist });
    while (history.current.length > 1 && history.current[0].t < now - HISTORY_MS) {
      history.current.shift();
    }
    const prior = history.current.slice(0, -1);

    if (state.current === STATES.COOLDOWN && now >= cooldownUntil.current) {
      state.current = STATES.IDLE;
    }

    switch (state.current) {
      case STATES.IDLE: {
        if (CFG.AIR_TAP_ENABLED && CFG.AIR_TAP_MODE === "velocity" && smoothedVelocity >= gamma) {
          // The origin is the last at-rest position BEFORE the motion began.
          let origin = prior.length ? prior[0] : { x: indexTip[0], y: indexTip[1] };
          for (let i = prior.length - 1; i >= 0; i--) {
            if (prior[i].ivp <= CFG.AIR_TAP_REST_VELOCITY_PALM) {
              origin = prior[i];
              break;
            }
          }
          const exc = distance2D(origin, indexTip) / pw;
          tap.current = { t: now, ox: origin.x, oy: origin.y, maxExc: exc };
          state.current = STATES.TAP_CANDIDATE;
          emitTelemetry("TAP_CANDIDATE_ENTER", { velocity: smoothedVelocity, excursion: exc });
          break;
        }
        if (pinchDist < CFG.PINCH_ENGAGE_THRESHOLD) {
          const tapEligible =
            CFG.AIR_TAP_ENABLED &&
            CFG.AIR_TAP_MODE === "pinch" &&
            prior.some(
              (h) =>
                h.pinch >= CFG.PINCH_TAP_OPEN_FROM &&
                now - h.t <= CFG.PINCH_TAP_CLOSE_WINDOW_MS,
            );
          hold.current = {
            t: now,
            x: indexTip[0],
            y: indexTip[1],
            pw,
            tapEligible,
            locked: false,
            lastMoveAt: now,
          };
          pinchDragLastY.current = indexTip[1];
          state.current = STATES.PINCH_HOLD;
          emitTelemetry("PINCH_HOLD_ENTER", { pinchDist, tapEligible });
        }
        break;
      }

      case STATES.TAP_CANDIDATE: {
        const elapsed = now - tap.current.t;
        const exc = distance2D({ x: tap.current.ox, y: tap.current.oy }, indexTip) / pw;
        tap.current.maxExc = Math.max(tap.current.maxExc, exc);

        if (elapsed > CFG.AIR_TAP_MAX_ACTIVE_MS) {
          emitTelemetry("TAP_REJECTED", {
            reason: "timeout",
            elapsed,
            maxExcursion: tap.current.maxExc,
            finalExcursion: exc,
          });
          state.current = STATES.IDLE;
          break;
        }
        if (
          elapsed >= CFG.AIR_TAP_MIN_ACTIVE_MS &&
          tap.current.maxExc >= CFG.AIR_TAP_MIN_EXCURSION_PALM &&
          exc < CFG.AIR_TAP_RETURN_RADIUS_PALM
        ) {
          fireAirTap(now, {
            via: "velocity",
            elapsed,
            maxExcursion: tap.current.maxExc,
            returnDistance: exc,
            velocityAtTrigger: smoothedVelocity,
          });
        }
        break;
      }

      case STATES.PINCH_HOLD: {
        const h = hold.current;
        const held = now - h.t;

        if (pinchDist > CFG.PINCH_RELEASE_THRESHOLD) {
          const drift = distance2D(h, indexTip) / h.pw;
          if (
            CFG.AIR_TAP_MODE === "pinch" &&
            h.tapEligible &&
            held >= CFG.PINCH_TAP_MIN_MS &&
            held <= CFG.PINCH_TAP_MAX_MS &&
            drift <= CFG.PINCH_TAP_MAX_DRIFT_PALM
          ) {
            fireAirTap(now, { via: "pinch", held, drift });
          } else {
            emitTelemetry("PINCH_HOLD_RELEASED_STATIC", {
              held,
              drift,
              tapEligible: h.tapEligible,
            });
            state.current = STATES.IDLE;
          }
          hold.current = null;
          pinchDragLastY.current = null;
          break;
        }

        if (!h.locked && held >= CFG.PINCH_DRAG_ARM_MS) {
          const dragDelta = indexTip[1] - pinchDragLastY.current;
          if (Math.abs(dragDelta) >= CFG.PINCH_DRAG_MIN_DELTA) {
            state.current = STATES.PINCH_DRAG;
            h.lastMoveAt = now;
            callbacksRef.current.onPinchStart?.();
            emitTelemetry("PINCH_START", { pinchDist });
          }
        }
        break;
      }

      case STATES.PINCH_DRAG: {
        const h = hold.current;
        if (pinchDist > CFG.PINCH_RELEASE_THRESHOLD) {
          callbacksRef.current.onPinchEnd?.();
          emitTelemetry("PINCH_END", { reason: "released" });
          state.current = STATES.IDLE;
          hold.current = null;
          pinchDragLastY.current = null;
          break;
        }
        const dragDeltaY = indexTip[1] - pinchDragLastY.current;
        if (Math.abs(dragDeltaY) >= CFG.PINCH_DRAG_DEADZONE) {
          pinchDragLastY.current = indexTip[1];
          h.lastMoveAt = now;
          callbacksRef.current.onPinchMove?.(dragDeltaY);
          emitTelemetry("PINCH_MOVE", { dragDeltaY });
        } else if (now - h.lastMoveAt > CFG.PINCH_DRAG_IDLE_MS) {
          // A held shape, not a scroll: stop, and require a release first.
          callbacksRef.current.onPinchEnd?.();
          emitTelemetry("PINCH_END", { reason: "idle_timeout" });
          h.locked = true;
          state.current = STATES.PINCH_HOLD;
        }
        break;
      }

      default:
        break;
    }

    // --- live metrics + per-frame trace for the calibration panel ---
    if (smoothedVelocity >= peak.current.value || now - peak.current.at > 2000) {
      peak.current = { value: smoothedVelocity, at: now };
    }
    m.velocity = smoothedVelocity;
    m.peakVelocity = peak.current.value;
    m.pinchDist = pinchDist;
    m.state = state.current;
    m.fps = fpsEma.current;

    callbacksRef.current.onFrameSample?.({
      t: Math.round(now),
      dt: Math.round(frameDt),
      x: r4(indexTip[0]),
      y: r4(indexTip[1]),
      z: r4(indexTip[2]),
      pw: r4(pw),
      v: r4(smoothedVelocity), // selected units
      ivp: r4(instPalm), // always palm units
      pinch: r4(pinchDist),
      // extension of middle/ring/pinky (tip-wrist / knuckle-wrist), to test an
      // "other fingers curled" rule against the OK sign later
      ext: [
        r2(extension(landmarks, MIDDLE_MCP, MIDDLE_TIP)),
        r2(extension(landmarks, RING_MCP, RING_TIP)),
        r2(extension(landmarks, PINKY_MCP, PINKY_TIP)),
      ],
      s: state.current,
    });
  }, []);

  return { processFrame, metricsRef };
};