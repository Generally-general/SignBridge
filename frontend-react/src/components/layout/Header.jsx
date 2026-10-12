import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-surface border-b border-border px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Logo variant="mark" height={30} alt="" className="shrink-0" />
          <h1 className="text-[14px] font-semibold tracking-[0.25em] uppercase text-text-primary hidden sm:block">
            SignBridge
          </h1>
        </div>

        {user && (
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-right hidden md:block">
              <p className="text-text-primary text-[13px] font-semibold">{user.fullName}</p>
              <p className="text-text-muted text-[11px]">
                {user.username ? `@${user.username}` : user.email}
              </p>
            </div>

            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-standard text-text-secondary hover:bg-muted transition-all"
                title="Home"
              >
                <Home className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-standard text-text-secondary hover:bg-muted transition-all"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              <Button variant="danger" onClick={handleLogout} className="flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};