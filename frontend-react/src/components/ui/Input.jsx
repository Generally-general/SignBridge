import React, { useId } from "react";

export const Input = React.forwardRef(
  ({ label, error, hint, className = "", rightElement, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-semibold text-text-primary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-11 px-3 rounded-standard border border-border text-[12px] text-black focus:outline-none focus:border-primary transition-all ${
              rightElement ? "pr-10" : ""
            } ${error ? "border-danger" : ""} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        {hint && !error && (
          <p className="text-[11px] text-text-muted">{hint}</p>
        )}
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
