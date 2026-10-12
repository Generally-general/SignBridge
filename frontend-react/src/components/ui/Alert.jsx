import React from 'react';

const variants = {
  error: 'bg-danger/5 border-danger/30 text-danger',
  warning: 'bg-warning/5 border-warning/30 text-warning',
  success: 'bg-success/5 border-success/30 text-success',
  info: 'bg-primary/5 border-primary/30 text-primary',
};

export const Alert = ({ variant = 'info', children, className = '' }) => {
  return (
    <div
      className={`w-full rounded-card border p-4 text-sm font-medium text-center ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
};