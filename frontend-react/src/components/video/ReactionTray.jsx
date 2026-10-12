import React, { useEffect, useRef, useState } from "react";
import { useCall } from "../../hooks/useCall";
import { EMOJI_FONT, REACTIONS } from "../../utils/touchEffects";

const LABELS = {
  "👍": "thumbs up",
  "❤️": "heart",
  "👏": "clapping",
  "😂": "laughing",
  "🙏": "thank you",
};

const btn =
  "w-9 h-9 rounded-full text-[18px] leading-none flex items-center justify-center hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

// Reactions and "get attention" for the other person. Plain buttons, so they also work by touch
// and with the hand pointer.
export const ReactionTray = () => {
  const { sendReaction, sendAttention } = useCall();
  const [open, setOpen] = useState(false);
  const [waved, setWaved] = useState(false);
  const timer = useRef(null);

  const rootRef = useRef(null);

  // Close when anything outside the tray is pressed, or on Escape.
  // "click" (not "pointerdown") so it also works with the hand pointer, which sends clicks.
  useEffect(() => {
    if (!open) return undefined;
    const closeIfOutside = (target) => {
      if (rootRef.current && !(target && rootRef.current.contains(target)))
        setOpen(false);
    };
    const onClick = (e) => closeIfOutside(e.target);
    const onTap = (e) =>
      closeIfOutside(document.elementFromPoint(e.detail.x, e.detail.y));
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("sb-pointer-tap", onTap);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("sb-pointer-tap", onTap);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const wave = () => {
    if (!sendAttention()) return;
    setWaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setWaved(false), 2000);
  };

  return (
    <div
      ref={rootRef}
      style={{ fontFamily: EMOJI_FONT }}
      className="absolute bottom-24 right-3 sm:bottom-28 sm:right-5 z-40 flex items-center gap-0.5 bg-surface/90 border border-border rounded-full p-1 shadow-card"
    >
      {open && (
        <>
          <button
            type="button"
            onClick={wave}
            aria-label="Wave to get their attention"
            title={waved ? "Sent" : "Wave to get their attention"}
            className={`${btn} ${waved ? "bg-primary/15" : ""}`}
          >
            ✋
          </button>
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => sendReaction(emoji)}
              aria-label={`Send ${LABELS[emoji]} reaction`}
              title={LABELS[emoji]}
              className={btn}
            >
              {emoji}
            </button>
          ))}
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close reactions" : "Open reactions"}
        title="Reactions"
        className={`${btn} ${open ? "bg-primary/15" : ""}`}
      >
        😊
      </button>
    </div>
  );
};
