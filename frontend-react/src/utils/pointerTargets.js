import { CLICKABLE } from "./pointerGeometry";

const REFRESH_MS = 400;

// Finds the clickable thing under the cursor WITHOUT asking the browser to hit-test.
// document.elementFromPoint forces layout and paint to be up to date, which is expensive on
// every hand frame while live video is playing. Instead the rectangles of clickable elements are
// read a few times a second and the lookup is plain arithmetic.
export const createTargetIndex = () => {
  let items = [];
  let builtAt = -Infinity;

  const rebuild = (now) => {
    items = [];
    document.querySelectorAll(CLICKABLE).forEach((el) => {
      if (el.disabled || el.getAttribute("aria-disabled") === "true") return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      items.push({ el, left: r.left, top: r.top, right: r.right, bottom: r.bottom, area: r.width * r.height });
    });
    builtAt = now;
  };

  return {
    invalidate: () => {
      builtAt = -Infinity;
    },
    // The smallest clickable rectangle containing the point (so a button inside a clickable card wins).
    hit: (x, y, now) => {
      if (now - builtAt > REFRESH_MS) rebuild(now);
      let best = null;
      for (const it of items) {
        if (x >= it.left && x <= it.right && y >= it.top && y <= it.bottom && (!best || it.area < best.area)) {
          best = it;
        }
      }
      return best ? best.el : null;
    },
  };
};