import React, { useEffect, useState } from "react";
import { BONES, COLORS, handToSvg } from "../../utils/handBadges";

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    update();
    q.addEventListener?.("change", update);
    return () => q.removeEventListener?.("change", update);
  }, []);
  return reduced;
};

export const HandBadge = ({
  badge = "open",
  color = "sky",
  size = 96,
  animate = true,
  label,
}) => {
  const reduced = useReducedMotion();
  const palette = COLORS[color] || COLORS.sky;
  const pts = handToSvg(badge);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label || "Hand badge"}
      style={{ borderRadius: "24%", background: palette.bg, flexShrink: 0 }}
    >
      <g>
        {animate && !reduced && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-3 50 85;3 50 85;-3 50 85"
            dur="3.6s"
            repeatCount="indefinite"
          />
        )}
        {BONES.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={pts[a][0]}
            y1={pts[a][1]}
            x2={pts[b][0]}
            y2={pts[b][1]}
            stroke={palette.fg}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        ))}
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === 0 ? 2.6 : 2}
            fill={palette.fg}
          />
        ))}
      </g>
    </svg>
  );
};
