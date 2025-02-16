import React, { ReactNode } from "react";

const buttonVariants = {
  default: "bg-slate-900 text-white hover:bg-slate-800",
  outline: "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900",
  destructive: "bg-red-500 text-white hover:bg-red-600"
};

type ButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof buttonVariants;
  [key: string]: any; // Allow any other props
};

const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = "", 
  variant = "default", 
  ...props 
}) => {
  return (
    <button
      className={`px-4 py-2 rounded-md font-medium transition-colors focus:outline-none 
        focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 
        disabled:opacity-50 disabled:pointer-events-none
        ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export { Button };