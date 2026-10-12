import React, { useState, useCallback, useEffect } from 'react';
import { AuthContext } from './AuthContextInstance';
import { tokenStorage } from '../utils/tokenStorage';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    tokenStorage.purgeLegacy();

    const storedUser = tokenStorage.getUser();
    const storedToken = tokenStorage.getToken();

    if (storedUser && storedToken) {
      if (tokenStorage.isExpired(storedToken)) {
        tokenStorage.clear();
      } else {
        setUser(storedUser);
      }
    } else if (storedUser || storedToken) {
      tokenStorage.clear();
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData, token) => {
    tokenStorage.setSession(userData, token);
    setUser(userData);
    setError(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const token = tokenStorage.getToken();
      if (token) tokenStorage.setSession(next, token);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
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
    updateUser,
    logout,
    setAuthError,
    clearError,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};