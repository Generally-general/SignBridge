import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { authService } from "../services/authService";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { validatePassword, getErrorMessage } from "../utils/validators";
import AuthLayout from "../components/layout/AuthLayout";

// The link looks like /reset-password#token=...  The token stays after the '#', so it is
// never sent to a server. It is read once and then removed from the address bar.
const readToken = () =>
  new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") || "";

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [token] = useState(readToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!password) next.password = "Password is required";
    else if (!validatePassword(password))
      next.password = "Password must be at least 8 characters";
    if (!confirm) next.confirm = "Please confirm your password";
    else if (password !== confirm) next.confirm = "Passwords do not match";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(token, password);
      navigate("/login", {
        replace: true,
        state: { message: "Password updated. Sign in with your new password." },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Reset link problem">
        <Alert variant="error">
          This reset link is incomplete. Please request a new one.
        </Alert>
        <div className="mt-6 text-center">
          <Link
            to="/forgot-password"
            className="text-[13px] text-primary font-semibold hover:text-primary/80"
          >
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      {error && (
        <Alert variant="error" className="mb-6">
          {error}{" "}
          <Link to="/forgot-password" className="underline">
            Request a new link
          </Link>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="New password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters"
          autoComplete="new-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-text-muted hover:text-text-secondary transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        <Input
          label="Confirm new password"
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <Button type="submit" isLoading={loading} fullWidth className="mt-2">
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
};