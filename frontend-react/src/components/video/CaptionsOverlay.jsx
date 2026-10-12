import React from "react";
import { useCall } from "../../hooks/useCall";

// Live captions of what the OTHER person is saying (speech-to-text).
// Finished lines are solid; the line still being spoken is dimmed and italic.
export const CaptionsOverlay = () => {
  const { captions } = useCall();

  if (!captions.finals.length && !captions.interim) {
    return null;
  }

  return (
    <div
      className="bg-surface/95 border border-border rounded-card p-3 max-w-2xl w-full"
      aria-live="polite"
    >
      <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">
        Speech
      </p>
      <div className="mt-1 flex flex-col justify-end max-h-28 overflow-hidden text-[15px] leading-snug">
        {captions.finals.map((line, i) => (
          <p key={i} className="text-text-primary">
            {line}
          </p>
        ))}
        {captions.interim && (
          <p className="text-text-primary opacity-70 italic">{captions.interim}</p>
        )}
      </div>
    </div>
  );
};