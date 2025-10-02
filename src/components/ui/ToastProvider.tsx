"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitive.Provider;

interface ToastProps {
  title?: string;
  description?: string;
}

export const toast = ({ title, description }: ToastProps) => {
  // Here you can integrate a toast system or your own component
  // For simplicity, just use alert for now
  alert(`${title}\n${description || ""}`);
};

// Optional: Create a styled Toast component
export const Toast = React.forwardRef<
  HTMLDivElement,
  ToastPrimitive.ToastProps
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "bg-white rounded-md p-4 shadow-md border border-gray-200",
      className
    )}
    {...props}
  />
));
Toast.displayName = "Toast";
