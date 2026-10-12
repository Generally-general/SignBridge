import React from "react";

const BASE = import.meta.env.BASE_URL;

// Files live in /public.
//   tone "white": light logo, for DARK backgrounds (the whole SignBridge UI is dark)
//   tone "dark" : near-black logo, for LIGHT backgrounds (print, light embeds)
//   variant "full": symbol + SIGNBRIDGE wordmark;  "mark": symbol only
const FILES = {
  white: { full: "SIGNBRIDGE_LOGO_WHITE.png", mark: "SIGNBRIDGE_MARK_WHITE.png" },
  dark: { full: "SIGNBRIDGE_LOGO_DARK.png", mark: "SIGNBRIDGE_MARK_DARK.png" },
};

// width / height of each image, so the browser reserves the space and nothing jumps while it loads
const RATIO = { full: 1000 / 788, mark: 600 / 635 };

export const Logo = ({
  variant = "full",
  tone = "white",
  height = 40,
  className = "",
  alt = "SignBridge",
}) => (
  <img
    src={`${BASE}${FILES[tone][variant]}`}
    alt={alt}
    width={Math.round(height * RATIO[variant])}
    height={height}
    draggable={false}
    style={{ height, width: "auto" }}
    className={`select-none ${className}`}
  />
);