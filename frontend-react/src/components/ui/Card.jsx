import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-surface border border-border rounded-card p-6 hover:border-primary/50 transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};