import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, Settings } from 'lucide-react';
import { Button } from '../ui/Button';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-slate-900 to-indigo-900 border-b border-white/10 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">SB</span>
          </div>
          <h1 className="text-2xl font-bold text-white">SignBridge</h1>
        </motion.div>

        {user && (
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-white/50 text-sm">{user.email}</p>
            </div>

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                title="Home"
              >
                <Home className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/settings')}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </motion.button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.header>
  );
};
