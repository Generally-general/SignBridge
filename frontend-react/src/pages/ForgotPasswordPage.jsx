import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../services/authService";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { validateEmail, getErrorMessage } from "../utils/validators";
import AuthLayout from "../components/layout/AuthLayout";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sentTo, setSentTo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return setEmailError("Email is required");
    if (!validateEmail(value)) return setEmailError("Invalid email format");
    setEmailError("");
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(value);
      setSentTo(value);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot your password?">
      {sentTo ? (
        <div className="flex flex-col gap-4">
          <Alert variant="success">
            If an account exists for {sentTo}, a reset link is on its way. It
            works for 30 minutes.
          </Alert>
          <p className="text-[12px] text-text-muted text-center">
            Nothing after a minute? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="text-primary font-semibold hover:text-primary/80"
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <>
          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}
          <p className="text-[13px] text-text-secondary mb-4">
            Enter the email you signed up with and we will send you a link to
            choose a new password.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Button type="submit" isLoading={loading} fullWidth>
              Send reset link
            </Button>
          </form>
        </>
      )}

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="text-[13px] text-primary font-semibold hover:text-primary/80 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};
