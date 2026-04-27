import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, EyeOff, Eye } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { validateEmail, validatePassword, validateName, getErrorMessage } from '../utils/validators';
import AuthLayout from '../components/layout/AuthLayout';

export const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!name) {
      newErrors.name = 'Name is required';
    } else if (!validateName(name)) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await authService.register(name, email, password);
      navigate('/login', {
        state: {message: 'Account created successfully! Please sign in.'}
      })
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
              className="mb-6"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              placeholder="John Doe"
              icon={<User className="w-5 h-5" />}
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="you@example.com"
              icon={<Mail className="w-5 h-5" />}
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

            {/* <Input
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
          } */}

            <Input
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              placeholder="••••••••"
              icon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-[#09090B] hover:text-[#A1A1AA] transition-colors focus:outline-none cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/70">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

        </AuthLayout>
  );
};
