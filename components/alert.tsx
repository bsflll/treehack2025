import React, { ReactNode } from "react";

const alertVariants = {
  default: "bg-slate-50 text-slate-900",
  destructive: "bg-red-50 text-red-900 border-red-500"
};

type AlertProps = {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof alertVariants;
  [key: string]: any; // Allow any other props
};

const Alert: React.FC<AlertProps> = ({ 
  children, 
  className = "", 
  variant = "default", 
  ...props 
}) => {
  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 
        ${alertVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export { Alert };