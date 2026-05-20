"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({
  label,
  name,
  error,
  description,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <Label
        htmlFor={name}
        className={cn(error && "text-destructive")}
      >
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
