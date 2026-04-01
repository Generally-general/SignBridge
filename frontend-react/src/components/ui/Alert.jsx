import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export const Alert = ({ type = 'info', message, onClose, className = '' }) => {
  const types = {
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-200',
    success: 'bg-green-500/20 border-green-500/50 text-green-200',
    error: 'bg-red-500/20 border-red-500/50 text-red-200',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200',
  };

  const icons = {
    info: <Info className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 p-4 rounded-lg border backdrop-blur-md ${types[type]} ${className}`}
    >
      {icons[type]}
      <p className="flex-1">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-lg font-bold hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </motion.div>
  );
};
