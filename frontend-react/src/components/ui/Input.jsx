import React from 'react';
import { motion } from 'framer-motion';

export const Input = React.forwardRef(
  ({ label, error, className = '', icon, ...props }, ref) => {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col">
        <div className="flex justify-between items-center">
          
        
        {label && (
          <label className="block text-sm font-medium text-white mb-2">
            {label}
          </label>
        )}

        {icon && (
          <div className="text-[12px] font-medium">
            {icon}
          </div>
        )}

        </div>
        <input
          ref={ref}
          className={`w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all ${className}`}
          {...props}
        />
        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      </motion.div>
    );
  }
);

Input.displayName = 'Input';
