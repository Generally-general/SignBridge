import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-standard px-4 py-2 text-[13px] font-bold transition-all duration-300 focus:outline-none';

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    danger: 'bg-danger text-white hover:bg-danger/90',
  };

  const widthClass = fullWidth ? 'w-full' : 'w-auto';

  const buttonClass = `${baseStyles} ${variants[variant] || variants.primary} ${widthClass} ${
    disabled || isLoading ? 'opacity-40 cursor-not-allowed' : ''
  } ${className}`;

  return (
    <button
      className={buttonClass}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      ) : (
        children
      )}
    </button>
  );
};