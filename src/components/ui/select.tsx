import { useState } from "react";

export const Select = ({ value, onValueChange, children, ...props }: any) => {
  return (
    <div className="relative" {...props}>
      {children}
    </div>
  );
};

export const SelectTrigger = ({ children, className = "", ...props }: any) => {
  return (
    <button
      className={`flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md bg-background ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const SelectValue = ({ placeholder, children, ...props }: any) => {
  return (
    <span className="text-sm" {...props}>
      {children || placeholder}
    </span>
  );
};

export const SelectContent = ({ children, className = "", ...props }: any) => {
  return (
    <div
      className={`absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const SelectItem = ({ value, children, ...props }: any) => {
  return (
    <div
      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
      {...props}
    >
      {children}
    </div>
  );
};