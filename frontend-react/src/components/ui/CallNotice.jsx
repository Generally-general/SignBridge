import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useCall } from "../../hooks/useCall";

const TONES = {
  info: "border-primary/40",
  warning: "border-warning/60",
};

// One short message about a call ("Bob is on another call", "Missed call from Ana"), shown on any page.
export const CallNotice = () => {
  const { callNotice, dismissCallNotice } = useCall();

  useEffect(() => {
    if (!callNotice) return undefined;
    const timer = setTimeout(dismissCallNotice, 6000);
    return () => clearTimeout(timer);
  }, [callNotice, dismissCallNotice]);

  if (!callNotice) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-start gap-3 bg-surface border ${TONES[callNotice.type] || TONES.info} rounded-card shadow-card px-4 py-3`}
      >
        <p className="flex-1 text-[13px] text-text-primary">
          {callNotice.text}
        </p>
        <button
          onClick={dismissCallNotice}
          aria-label="Dismiss"
          className="shrink-0 p-0.5 text-text-muted hover:text-text-primary transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
