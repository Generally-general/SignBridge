import React, { useEffect, useId, useRef, useState } from "react";
import { authService } from "../../services/authService";
import { normalizeUsername, usernameProblem } from "../../utils/contactsUi";

const COLORS = {
  available: "text-success",
  taken: "text-danger",
  invalid: "text-danger",
  error: "text-warning",
};

// A username input that tells people right away whether the name is free.
// onStatusChange gets: idle | invalid | checking | available | taken | same | error
export const UsernameField = ({
  value,
  onChange,
  onStatusChange,
  currentUsername = "",
  label = "Username",
  hint = "3-20 letters, numbers or underscore",
  error = "",
  tone = "auth", // "auth": light field on the sign-up card, "app": dark field inside the app
  disabled = false,
}) => {
  const id = useId();
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const ticket = useRef(0);
  const report = useRef(onStatusChange);
  report.current = onStatusChange;

  useEffect(() => {
    const mine = ++ticket.current; // a newer keystroke makes every older answer irrelevant
    const set = (state, message = "") => {
      if (ticket.current !== mine) return;
      setStatus({ state, message });
      report.current?.(state);
    };

    const name = normalizeUsername(value);
    if (!name) {
      set("idle");
      return undefined;
    }
    if (name === normalizeUsername(currentUsername)) {
      set("same", "This is your current username");
      return undefined;
    }
    const problem = usernameProblem(name);
    if (problem) {
      set("invalid", problem);
      return undefined;
    }

    set("checking", "Checking...");
    const timer = setTimeout(async () => {
      try {
        const result = await authService.usernameAvailable(name);
        set(
          result.available ? "available" : "taken",
          result.available ? "Available" : result.reason || "Already taken",
        );
      } catch {
        set("error", "Could not check right now");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [value, currentUsername]);

  const fieldTone =
    tone === "app" ? "bg-background text-text-primary" : "bg-white text-black";
  const shown = error || status.message || hint;
  const color = error
    ? "text-danger"
    : COLORS[status.state] || "text-text-muted";

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-[13px] font-semibold text-text-primary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-text-muted select-none">
          @
        </span>
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          maxLength={20}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => onChange(normalizeUsername(e.target.value))}
          placeholder="your_username"
          className={`w-full h-11 pl-7 pr-3 rounded-standard border text-[12px] focus:outline-none focus:border-primary transition-all ${fieldTone} ${
            error || status.state === "invalid" || status.state === "taken"
              ? "border-danger"
              : "border-border"
          }`}
        />
      </div>
      <p className={`text-[11px] min-h-[14px] ${color}`} aria-live="polite">
        {shown}
      </p>
    </div>
  );
};
