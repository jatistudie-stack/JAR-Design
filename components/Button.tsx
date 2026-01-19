
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  // Add size property to fix "Property 'size' does not exist" errors in App.tsx
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false, 
  className = '', 
  icon,
  ...props 
}) => {
  // Removed hardcoded padding and font size from baseStyles to delegate to sizes object
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500 shadow-sm",
    secondary: "bg-stone-800 hover:bg-stone-900 text-white focus:ring-stone-700 shadow-sm",
    outline: "border border-brand-600 text-brand-600 hover:bg-brand-50 focus:ring-brand-500",
    ghost: "text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus:ring-stone-500",
  };

  // Define dimensions for each size variant
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`} 
      {...props}
    >
      {icon && <span className="mr-2 -ml-1">{icon}</span>}
      {children}
    </button>
  );
};
