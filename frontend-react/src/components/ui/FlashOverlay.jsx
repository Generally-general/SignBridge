import React from "react";

// A slow, gentle colour pulse over the whole screen: about once a second, well under the limit of three
// flashes per second that guidelines set for flashing content. With "reduce motion" switched on in the
// system it becomes a steady tint instead. It never blocks clicks.
export const FlashOverlay = () => (
  <>
    <style>{`
      @keyframes sbFlash { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      .sb-flash { background: rgba(34, 197, 94, 0.38); animation: sbFlash 0.9s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { .sb-flash { animation: none; opacity: 0.45; } }
    `}</style>
    <div
      data-testid="flash-overlay"
      aria-hidden="true"
      className="sb-flash pointer-events-none fixed inset-0 z-[55]"
    />
  </>
);