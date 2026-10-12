import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userService";
import { getErrorMessage, validatePassword } from "../../utils/validators";
import { SettingsSection } from "./controls";

const Field = ({ id, label, value, onChange, autoComplete, error, hint }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-semibold text-text-primary"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-11 bg-background border rounded-standard pl-3 pr-10 text-[13px] text-text-primary focus:outline-none focus:border-primary ${
            error ? "border-danger" : "border-border"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={
            show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary focus:outline-none"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && !error && <p className="text-[11px] text-text-muted">{hint}</p>}
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
};

export const ChangePasswordCard = () => {
  const { login } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  const save = async (e) => {
    e.preventDefault();
    const found = {};
    if (!current) found.current = "Enter your current password";
    if (!next) found.next = "Enter a new password";
    else if (!validatePassword(next)) found.next = "At least 8 characters";
    else if (next === current) found.next = "Choose a different password";
    if (next && confirm !== next) found.confirm = "Passwords do not match";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setMessage(null);
    try {
      const result = await userService.changePassword(current, next);
      // Older sessions stop working after a change, so keep this one on the fresh token.
      login(result.userResponse, result.token);
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage({
        type: "success",
        text: "Password changed. Your other sessions will need to sign in again.",
      });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      id="security"
      title="Password"
      description="Choose a password you do not use anywhere else."
    >
      <form onSubmit={save} className="p-4 flex flex-col gap-4">
        <Field
          id="pw-current"
          label="Current password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          error={errors.current}
        />
        <Field
          id="pw-new"
          label="New password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          error={errors.next}
          hint="At least 8 characters"
        />
        <Field
          id="pw-confirm"
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={errors.confirm}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={saving}>
            Change password
          </Button>
          {message && (
            <Alert
              variant={message.type}
              className="!w-auto !py-2 !px-3 !text-[12px]"
            >
              {message.text}
            </Alert>
          )}
        </div>
      </form>
    </SettingsSection>
  );
};
