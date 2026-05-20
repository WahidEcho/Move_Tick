"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "./form-field";
import { cn } from "@/lib/utils";

export interface FormSelectOption {
  label: string;
  value: string;
}

export interface FormSelectProps {
  label: string;
  name: string;
  options: FormSelectOption[];
  placeholder?: string;
  error?: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function FormSelect({
  label,
  name,
  options,
  placeholder = "Select...",
  error,
  value,
  onChange,
  required,
}: FormSelectProps) {
  return (
    <FormField label={label} name={name} error={error} required={required}>
      <Select
        value={value ?? ""}
        onValueChange={(v) => onChange(v ?? "")}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        <SelectTrigger
          id={name}
          className={cn(
            "w-full",
            error && "border-destructive focus-visible:ring-destructive/20"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export { FormSelect };
