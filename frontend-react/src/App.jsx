import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { CallPage } from './pages/CallPage';
import { SettingsPage } from './pages/SettingsPage';

import IncomingCallModal from './components/ui/IncomingCallModal';

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* CallProvider must be inside AuthProvider to access user tokens */}
        <CallProvider>
          <div className="bg-gradient-to-br from-slate-900 to-indigo-900 min-h-screen">
            
            {/* 2. Global Modal: Listens for signaling events across all pages */}
            <IncomingCallModal />

            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <>
                      <Header />
                      <DashboardPage />
                    </>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/call"
                element={
                  <ProtectedRoute>
                    <CallPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <>
                      <Header />
                      <SettingsPage />
                    </>
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </CallProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;