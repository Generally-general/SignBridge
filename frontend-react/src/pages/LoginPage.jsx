import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, EyeOff, Eye } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { validateEmail } from "../utils/validators";
import { getErrorMessage } from "../utils/validators";
import AuthLayout from "../components/layout/AuthLayout";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(email, password);
      login(response.userResponse, response.token);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  const location = useLocation();

  return (
    <AuthLayout title="Welcome Back">
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
          className="mb-6"
        />
      )}
      {location.state?.message && <Alert type="success" message={location.state.message} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="••••••••"
          icon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#09090B] hover:text-[#A1A1AA] transition-colors focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
          className="w-full mt-6"
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-white/70">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
