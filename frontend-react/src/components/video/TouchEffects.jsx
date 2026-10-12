import React, { useEffect, useRef } from "react";
import { useCall } from "../../hooks/useCall";
import {
  ATTENTION_LIFETIME_MS,
  EMOJI_FONT,
  REACTION_LIFETIME_MS,
  playChime,
} from "../../utils/touchEffects";

const Floating = ({ item, onDone }) => {
  useEffect(() => {
    const t = setTimeout(() => onDone(item.id), REACTION_LIFETIME_MS);
    return () => clearTimeout(t);
  }, [item.id, onDone]);
  // Mine drift up on the right, theirs on the left; a little spread so they do not stack.
  const spread = (item.id * 37) % 24;
  const pos = item.own
    ? { right: `${6 + spread}%` }
    : { left: `${6 + spread}%` };
  const style = { ...pos, fontFamily: EMOJI_FONT };
  return (
    <span
      className="sb-float absolute bottom-28 text-[34px] leading-none select-none"
      style={style}
      aria-hidden="true"
    >
      {item.emoji}
    </span>
  );
};

// What the other person's reactions and waves look like on this screen, plus my own reactions.
export const TouchEffects = () => {
  const {
    reactions,
    dismissReaction,
    attention,
    dismissAttention,
    activeCall,
  } = useCall();
  const name = activeCall?.contactName || "The other person";
  const originalTitle = useRef(null);

  useEffect(() => {
    if (!attention) return undefined;
    playChime();
    if (document.hidden) {
      originalTitle.current = originalTitle.current ?? document.title;
      document.title = `✋ ${name} wants your attention`;
    }
    const t = setTimeout(dismissAttention, ATTENTION_LIFETIME_MS);
    return () => {
      clearTimeout(t);
      if (originalTitle.current !== null) {
        document.title = originalTitle.current;
        originalTitle.current = null;
      }
    };
  }, [attention, dismissAttention, name]);

  return (
    <>
      <style>{`
        @keyframes sb-float { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-240px); opacity: 0; } }
        .sb-float { animation: sb-float ${REACTION_LIFETIME_MS - 200}ms ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .sb-float { animation: none; } }
      `}</style>
      <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
        {reactions.map((r) => (
          <Floating key={r.id} item={r} onDone={dismissReaction} />
        ))}
      </div>
      {attention && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[45] pointer-events-none border-4 border-primary animate-pulse"
          />
          <button
            type="button"
            role="alert"
            onClick={dismissAttention}
            style={{ fontFamily: EMOJI_FONT }}
            className="absolute top-28 left-1/2 -translate-x-1/2 z-[56] px-4 py-2 rounded-full bg-primary text-white text-[13px] font-semibold shadow-card"
          >
            ✋ {name} is waving to get your attention
          </button>
        </>
      )}
    </>
  );
};
