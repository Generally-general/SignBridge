import React, { useEffect, useState } from "react";
import { WifiOff, Hand, X } from "lucide-react";
import { useCall } from "../../hooks/useCall";
import { useNetworkQuality } from "../../hooks/useNetworkQuality";

// Offers skeleton mode when my connection is too weak to send smooth video. It only suggests; the
// person decides. "Not now" silences it for the rest of this call.
export const NetworkSuggestion = () => {
  const {
    activeCall,
    remoteStream,
    cameraEnabled,
    skeletonMode,
    toggleSkeleton,
    getConnectionStats,
  } = useCall();
  const [dismissed, setDismissed] = useState(false);

  const roomId = activeCall?.roomId;
  useEffect(() => {
    setDismissed(false);
  }, [roomId]);

  // Only while connected, with my video on and not already in skeleton mode.
  const watching =
    !!remoteStream && cameraEnabled && !skeletonMode && !dismissed;
  const { poor } = useNetworkQuality(getConnectionStats, watching);

  if (!watching || !poor) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md bg-surface border border-border rounded-card shadow-card p-3 flex items-start gap-3"
    >
      <span className="mt-0.5 w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-text-primary">
        <WifiOff className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary">
          Your connection is weak
        </p>
        <p className="text-[12px] text-text-muted mt-0.5 leading-snug">
          Skeleton mode sends only your hand, face and body points instead of
          video, so your signs stay smooth.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              toggleSkeleton();
              setDismissed(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-standard bg-primary text-white text-[12px] font-semibold"
          >
            <Hand className="w-3.5 h-3.5" />
            Switch to skeleton mode
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-standard text-[12px] text-text-muted hover:bg-muted"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-text-muted hover:text-text-primary shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
