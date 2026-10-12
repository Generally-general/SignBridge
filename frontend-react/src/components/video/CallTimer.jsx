import React, { useEffect, useState } from "react";
import { useCall } from "../../hooks/useCall";
import { formatDuration } from "../../utils/formatDuration";

// Call duration, counted from the moment the media connection is established.
export const CallTimer = () => {
  const { callStartedAt, activeCall } = useCall();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!callStartedAt) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [callStartedAt]);

  if (!callStartedAt) {
    return (
      <span className="text-text-muted text-[10px] uppercase tracking-tighter">
        {activeCall && !activeCall.isIncoming ? "Ringing…" : "Connecting…"}
      </span>
    );
  }
  return (
    <span
      className="text-text-primary text-[11px] font-semibold tabular-nums"
      aria-label="Call duration"
    >
      {formatDuration(now - callStartedAt)}
    </span>
  );
};
