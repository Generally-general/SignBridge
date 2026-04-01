import React, { createContext, useState, useCallback, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('signbridge_user');
    const storedToken = localStorage.getItem('signbridge_token');

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem('signbridge_user');
        localStorage.removeItem('signbridge_token');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData, token) => {
    setUser(userData);
    localStorage.setItem('signbridge_user', JSON.stringify(userData));
    localStorage.setItem('signbridge_token', token);
    setError(null);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('signbridge_user');
    localStorage.removeItem('signbridge_token');
    setError(null);
  }, []);

  const setAuthError = useCallback((errorMsg) => {
    setError(errorMsg);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    setAuthError,
    clearError,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
