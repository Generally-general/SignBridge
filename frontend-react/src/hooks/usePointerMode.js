import { useCallback, useEffect, useRef, useState } from "react";
import { POINTER_CONFIG as CFG } from "../utils/pointerConfig";
import { OneEuro } from "../utils/oneEuro";
import {
  clickableFrom,
  isTypingTarget,
  mapToScreen,
  pointerSupported,
  scrollableFrom,
} from "../utils/pointerGeometry";
import { createTargetIndex } from "../utils/pointerTargets";
import { countReversals, isOpenHand } from "../utils/waveDetect";
import { POINTER_BISECT } from "../utils/pointerPrefs";
import { isSpatialDebugEnabled } from "../utils/spatialTouchConfig";
import { distance2D, palmWidth } from "../utils/spatialTouchGeometry";

const THUMB_TIP = 4;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const INDEX_TIP = 8;
const PINKY_MCP = 17;

const INITIAL = {
  visible: false,
  pinched: false,
  dwell: 0, // 0..1 progress toward a dwell click, in steps of 0.05
  clickId: 0, // changes on every click so the overlay can pulse
};

const createStore = () => {
  let snap = INITIAL;
  let node = null;
  let pos = { x: 0, y: 0 };
  const listeners = new Set();
  const place = () => {
    if (node) node.style.transform = `translate3d(${pos.x - 15}px, ${pos.y - 15}px, 0)`;
  };
  return {
    get: () => snap,
    // Notifies React only when something other than the position changed.
    set: (patch) => {
      if (Object.keys(patch).every((k) => snap[k] === patch[k])) return;
      snap = { ...snap, ...patch };
      listeners.forEach((l) => l());
    },
    // The cursor moves by writing its transform directly: no React render per hand frame.
    moveTo: (x, y) => {
      pos = { x, y };
      place();
    },
    attach: (el) => {
      node = el;
      place();
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
};

/**
 * Hand pointer for computers. Hold Space (or press P to latch) to turn it on:
 * the cursor follows the hand, a quick pinch clicks, a pinch-and-drag over a scrolling
 * list scrolls it, and hovering for DWELL_MS clicks when dwell is enabled.
 * The caller pauses translation and the old pinch-scroll while `active` is true.
 *
 * The cursor sits on the index knuckle, not the fingertip, because closing a pinch moves the
 * fingertip and would drag the click away from what was aimed at.
 *
 * Cost control: no per-frame hit test (see utils/pointerTargets.js) and no per-frame React render.
 */
export const usePointerMode = ({ enabled = true, dwell = false, mirror = true, onWave, } = {}) => {
  const supported = pointerSupported();
  const [latched, setLatched] = useState(false);
  const active = enabled && supported && POINTER_BISECT !== "inert" && latched;

  const activeRef = useRef(false);
  activeRef.current = active;
  const dwellRef = useRef(dwell);
  dwellRef.current = dwell;
  const mirrorRef = useRef(mirror);
  mirrorRef.current = mirror;
  const onWaveRef = useRef(onWave);
  onWaveRef.current = onWave;
  const waveSamples = useRef([]);
  const waveCooldownUntil = useRef(0);

  const filters = useRef(null);
  if (!filters.current) {
    filters.current = {
      x: new OneEuro(CFG.FILTER_MIN_CUTOFF, CFG.FILTER_BETA, CFG.FILTER_D_CUTOFF),
      y: new OneEuro(CFG.FILTER_MIN_CUTOFF, CFG.FILTER_BETA, CFG.FILTER_D_CUTOFF),
    };
  }
  const pinch = useRef(null); // { t, x, y, lastY, target, scroller, scrolling }
  const hoverEl = useRef(null);
  const hoverCheck = useRef({ el: null, ok: false, at: 0 });
  const dwellState = useRef({ el: null, since: 0, fired: false });
  const lastSeen = useRef(0);
  const lastHandAt = useRef(0);
  const clickId = useRef(0);
  const perf = useRef({ n: 0, ms: 0, max: 0, since: 0 });
  const debugRef = useRef(isSpatialDebugEnabled());

  const targets = useRef(null);
  if (!targets.current) targets.current = createTargetIndex();
  const storeRef = useRef(null);
  if (!storeRef.current) storeRef.current = createStore();
  const store = storeRef.current;

  const setHover = (el) => {
    if (hoverEl.current === el) return;
    hoverEl.current?.removeAttribute?.("data-pointer-hover");
    el?.setAttribute?.("data-pointer-hover", "");
    hoverEl.current = el;
  };

  const resetInteraction = useCallback(() => {
    filters.current.x.reset();
    filters.current.y.reset();
    pinch.current = null;
    waveSamples.current = [];
    dwellState.current = { el: null, since: 0, fired: false };
    hoverCheck.current = { el: null, ok: false, at: 0 };
    hoverEl.current?.removeAttribute?.("data-pointer-hover");
    hoverEl.current = null;
    store.set({ visible: false, pinched: false, dwell: 0 });
  }, [store]);

  // Leaving pointer mode always tidies up; entering starts a fresh target list.
  useEffect(() => {
    if (!active) resetInteraction();
    else {
      lastHandAt.current = performance.now();
      targets.current.invalidate();
    }
  }, [active, resetInteraction]);

  // ---- keyboard trigger: P toggles, Esc ends ----
  // Not a held key: holding a key floods the page with repeat events, which starved the self-view
  // video while hand tracking had the main thread busy.
  useEffect(() => {
    if (!enabled || !supported) {
      setLatched(false);
      return undefined;
    }
    const onKeyDown = (e) => {
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "KeyP" && !e.repeat) setLatched((v) => !v);
      else if (e.code === "Escape") setLatched(false);
    };
    const onVisibility = () => {
      if (document.hidden) setLatched(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, supported]);

  // Latched mode ends itself when nobody is there.
  useEffect(() => {
    if (!latched) return undefined;
    const id = setInterval(() => {
      if (performance.now() - lastHandAt.current > CFG.LATCH_IDLE_MS) setLatched(false);
    }, 500);
    return () => clearInterval(id);
  }, [latched]);

  const click = useCallback(
    (el) => {
      clickId.current += 1;
      el.click();
      store.set({ clickId: clickId.current });
    },
    [store],
  );

  // The clickable under (x, y) from the cached rectangles. Whether something (a dialog, say) covers
  // it is confirmed with ONE real hit test when the candidate changes, never once per frame.
  const targetAt = useCallback((x, y, now) => {
    const cand = targets.current.hit(x, y, now);
    if (!cand) return null;
    const c = hoverCheck.current;
    if (c.el !== cand || now - c.at > 500) {
      const top = document.elementFromPoint(x, y);
      hoverCheck.current = { el: cand, ok: !!top && (cand === top || cand.contains(top)), at: now };
    }
    return hoverCheck.current.ok ? cand : null;
  }, []);

  const detectWave = (landmarks, pw, now) => {
    if (!isOpenHand(landmarks)) {
      waveSamples.current = []; // only continuous open-hand motion counts
      return;
    }
    const s = waveSamples.current;
    s.push({ t: now, x: landmarks[MIDDLE_MCP][0] });
    while (s.length && s[0].t < now - CFG.WAVE_WINDOW_MS) s.shift();
    if (now < waveCooldownUntil.current || s.length < 6) return;
    if (countReversals(s, CFG.WAVE_MIN_TRAVEL_PALM * pw) >= CFG.WAVE_MIN_REVERSALS) {
      waveCooldownUntil.current = now + CFG.WAVE_COOLDOWN_MS;
      waveSamples.current = [];
      onWaveRef.current?.();
    }
  };

  const frame = useCallback(
    (landmarks, now) => {
      if (!landmarks) {
        if (now - lastSeen.current > CFG.LOST_MS && store.get().visible) {
          // Losing the hand cancels a pinch in progress; it must not turn into a click.
          pinch.current = null;
          waveSamples.current = [];
          setHover(null);
          store.set({ visible: false, pinched: false, dwell: 0 });
        }
        return;
      }
      const pw = palmWidth(landmarks[INDEX_MCP], landmarks[PINKY_MCP]);
      if (!pw) return;
      lastSeen.current = now;
      lastHandAt.current = now;

      const raw = mapToScreen(
        landmarks[INDEX_MCP],
        window.innerWidth,
        window.innerHeight,
        mirrorRef.current,
      );
      const x = filters.current.x.filter(raw.x, now);
      const y = filters.current.y.filter(raw.y, now);
      store.moveTo(x, y);

      const dist = distance2D(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) / pw;
      const wasPinched = !!pinch.current;
      const target = wasPinched ? hoverEl.current : targetAt(x, y, now);

      if (!wasPinched && dist < CFG.PINCH_ENGAGE) {
        // One real hit test per pinch: what is under the cursor, and does it scroll?
        const under = document.elementFromPoint(x, y);
        pinch.current = {
          t: now,
          x,
          y,
          lastY: y,
          target: clickableFrom(under),
          scroller: scrollableFrom(under),
          scrolling: false,
        };
      } else if (wasPinched) {
        const p = pinch.current;
        if (dist > CFG.PINCH_RELEASE) {
          const quick = now - p.t <= CFG.CLICK_MAX_MS;
          const still = Math.hypot(x - p.x, y - p.y) <= CFG.CLICK_DRIFT_PX;
          if (!p.scrolling && quick && still && p.target?.isConnected) click(p.target);
          pinch.current = null;
        } else {
          if (!p.scrolling && p.scroller && Math.abs(y - p.y) > CFG.SCROLL_ARM_PX) {
            p.scrolling = true;
          }
          if (p.scrolling && p.scroller) {
            p.scroller.scrollTop += (y - p.lastY) * CFG.SCROLL_GAIN;
          }
          p.lastY = y;
        }
      }

      const pinched = !!pinch.current;
      if (!pinched) setHover(target);

      if (!pinched && onWaveRef.current) detectWave(landmarks, pw, now);

      // Dwell: keep still over a button to press it. Never on End call or text fields.
      let progress = 0;
      const d = dwellState.current;
      const dwellable =
        dwellRef.current &&
        !pinched &&
        target &&
        !target.hasAttribute("data-pointer-confirm") &&
        !/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName);
      if (dwellable) {
        if (d.el !== target) {
          dwellState.current = { el: target, since: now, fired: false };
        } else if (!d.fired) {
          progress = Math.min(1, (now - d.since) / CFG.DWELL_MS);
          if (progress >= 1) {
            d.fired = true;
            progress = 0;
            click(target);
          }
        }
      } else if (d.el) {
        dwellState.current = { el: null, since: 0, fired: false };
      }

      store.set({
        visible: true,
        pinched,
        dwell: Math.round(progress * 20) / 20,
      });
    },
    [store, targetAt, click],
  );

  // Call with the first hand's 21 landmarks (or null when there is no hand) on every frame.
  const processFrame = useCallback(
    (landmarks) => {
      if (!activeRef.current || POINTER_BISECT === "noframes") return;
      const start = performance.now();
      frame(landmarks, start);
      if (debugRef.current) {
        const p = perf.current;
        const took = performance.now() - start;
        p.n += 1;
        p.ms += took;
        p.max = Math.max(p.max, took);
        if (start - p.since > 2000) {
          // eslint-disable-next-line no-console
          console.log(
            `[pointer] ${p.n} frames, avg ${(p.ms / p.n).toFixed(2)} ms, max ${p.max.toFixed(1)} ms`,
          );
          perf.current = { n: 0, ms: 0, max: 0, since: start };
        }
      }
    },
    [frame],
  );

  return {
    supported,
    active,
    latched,
    toggleLatch: () => setLatched((v) => !v),
    processFrame,
    store,
  };
};