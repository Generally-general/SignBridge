import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-muted text-text-secondary',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/5 text-success',
    warning: 'bg-warning/5 text-warning',
    error: 'bg-danger/5 text-danger',
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};