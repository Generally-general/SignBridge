import React from 'react';

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-surface border border-border rounded-card p-6 w-full ${sizes[size]}`}
      >
        {title && (
          <h2 className="text-[16px] font-semibold text-text-primary mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
};