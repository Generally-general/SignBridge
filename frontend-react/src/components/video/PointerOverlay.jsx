import React, { useSyncExternalStore } from "react";
import { MousePointer2 } from "lucide-react";
import { POINTER_BISECT } from "../../utils/pointerPrefs";

const RING = 30;
const RADIUS = 13;
const CIRC = 2 * Math.PI * RADIUS;

const Cursor = ({ store }) => {
  const s = useSyncExternalStore(store.subscribe, store.get);
  if (!s.visible) return null;
  return (
    <div
      ref={store.attach}
      aria-hidden="true"
      className="fixed left-0 top-0 z-[60] pointer-events-none"
      style={{ willChange: "transform" }}
    >
      <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={RADIUS}
          fill={s.pinched ? "rgba(37,99,235,0.55)" : "rgba(37,99,235,0.12)"}
          stroke="#2563EB"
          strokeWidth="2"
        />
        {s.dwell > 0 && (
          <circle
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - s.dwell)}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        )}
        <circle cx={RING / 2} cy={RING / 2} r="2" fill="#2563EB" />
      </svg>
      <span
        key={s.clickId}
        className={
          s.clickId
            ? "absolute inset-0 rounded-full border-2 border-primary animate-ping"
            : "hidden"
        }
      />
    </div>
  );
};

// The cursor, the "pointing" banner, and the small hint that the feature exists.
export const PointerOverlay = ({ pointer }) => {
  if (!pointer.supported || POINTER_BISECT === "nooverlay") return null;
  const { active, store } = pointer;
  return (
    <>
      {active && (
        <style>{`[data-pointer-hover]{outline:2px solid #2563EB;outline-offset:2px;border-radius:8px}`}</style>
      )}
      {active && (
        <div
          role="status"
          className="absolute top-14 left-1/2 -translate-x-1/2 z-[55] px-3 py-1.5 rounded-full bg-primary text-white text-[12px] font-semibold shadow-card pointer-events-none"
        >
          Pointing on. Press P or Esc to go back to signing
        </div>
      )}
      {active && <Cursor store={store} />}
      {!active && (
        <button
          type="button"
          onClick={pointer.toggleLatch}
          title="Press P to point at the screen with your hand"
          className="hidden sm:flex absolute bottom-4 left-4 z-40 items-center gap-1.5 bg-surface/90 border border-border px-2.5 py-1.5 rounded-standard text-[11px] text-text-primary"
        >
          <MousePointer2 className="w-3.5 h-3.5" />
          Press P to point
        </button>
      )}
    </>
  );
};
