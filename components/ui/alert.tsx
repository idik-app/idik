"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

const variantIcons = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantIcons;
  title?: string;
  message?: string;
}

export function Alert({
  variant = "default",
  title,
  message,
  className,
  ...props
}: AlertProps) {
  const Icon = variantIcons[variant] || Info;

  const variantClasses = {
    default: "border-gray-300 text-gray-800 bg-gray-50 dark:bg-gray-900",
    success: "border-green-400 text-green-800 bg-green-50 dark:bg-green-950",
    error: "border-red-400 text-red-800 bg-red-50 dark:bg-red-950",
    warning:
      "border-yellow-400 text-yellow-800 bg-yellow-50 dark:bg-yellow-950",
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title && <h5 className="font-semibold mb-1">{title}</h5>}
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
