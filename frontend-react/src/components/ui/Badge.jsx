import React from 'react';
import { motion } from 'framer-motion';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30',
    success: 'bg-green-400/20 text-green-400 border border-green-400/30',
    warning: 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30',
    error: 'bg-red-400/20 text-red-400 border border-red-400/30',
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </motion.span>
  );
};
