import React from "react";
import { ChevronDown } from "lucide-react";

export const Toggle = ({ checked, onChange, disabled = false, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-40 disabled:cursor-not-allowed ${
      checked ? "bg-primary" : "bg-border"
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-5" : ""
      }`}
    />
  </button>
);

export const SettingRow = ({
  title,
  hint,
  children,
  stacked = false,
  stackOnMobile = false,
}) => (
  <div
    className={`p-4 flex gap-3 sm:gap-4 ${
      stacked
        ? "flex-col"
        : stackOnMobile
          ? "flex-col sm:flex-row sm:items-center sm:justify-between"
          : "items-center justify-between"
    }`}
  >
    <div className="min-w-0">
      <p className="text-[13px] font-semibold text-text-primary">{title}</p>
      {hint && (
        <p className="text-[12px] text-text-muted mt-0.5 leading-snug">
          {hint}
        </p>
      )}
    </div>
    {children}
  </div>
);

export const SettingSelect = ({
  value,
  onChange,
  options,
  disabled = false,
  ariaLabel,
}) => (
  <div className="relative w-full max-w-full sm:w-64 sm:shrink-0">
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 appearance-none bg-background border border-border rounded-standard pl-3 pr-9 text-[12px] text-text-primary focus:outline-none focus:border-primary disabled:opacity-40"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);

export const SettingsSection = ({
  id,
  title,
  description,
  children,
  bare = false,
}) => (
  <section id={id} className="scroll-mt-20">
    <h2 className="text-[16px] font-semibold text-text-primary">{title}</h2>
    {description && (
      <p className="text-[12px] text-text-muted mt-1 mb-3">{description}</p>
    )}
    <div
      className={`${description ? "" : "mt-3"} bg-surface border border-border rounded-card ${
        bare ? "p-4" : "divide-y divide-border"
      }`}
    >
      {children}
    </div>
  </section>
);
