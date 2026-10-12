import { POINTER_CONFIG as CFG } from "./pointerConfig";

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// A normalised camera point ([x, y, ...], 0..1) to a screen position in pixels.
// The self-view is mirrored, so x is flipped to make the cursor follow the hand like a mirror.
export const mapToScreen = (pt, width, height, mirror = true, region = CFG.REGION) => {
  const nx = mirror ? 1 - pt[0] : pt[0];
  const sx = clamp01((nx - region.x0) / (region.x1 - region.x0));
  const sy = clamp01((pt[1] - region.y0) / (region.y1 - region.y0));
  return { x: sx * (width - 1), y: sy * (height - 1) };
};

export const CLICKABLE =
  'button, a[href], select, summary, input, [role="button"], [role="menuitem"], [role="radio"], [role="switch"], [role="tab"], [data-pointer-target]';

export const clickableFrom = (el) => {
  const target = el?.closest?.(CLICKABLE);
  if (!target) return null;
  if (target.disabled || target.getAttribute("aria-disabled") === "true") return null;
  return target;
};

// Nearest ancestor that actually scrolls vertically (the chat list, for example).
export const scrollableFrom = (el) => {
  let node = el;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

export const isTypingTarget = (t) =>
  !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

// Computers with a mouse or trackpad only; the layer is not offered on touch devices.
export const pointerSupported = () => {
  try {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  } catch {
    return false;
  }
};