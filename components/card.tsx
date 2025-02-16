import React, { ReactNode } from "react";

type CardProps = {
  className?: string;
  children: ReactNode;
  [key: string]: any; // Allow any other props
};

const Card: React.FC<CardProps> = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardProps> = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardTitle: React.FC<CardProps> = ({ className = "", children, ...props }) => {
  return (
    <h3
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

const CardContent: React.FC<CardProps> = ({ className = "", children, ...props }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardTitle, CardContent };