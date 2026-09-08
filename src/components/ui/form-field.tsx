"use client";

import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type FormFieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  leadingIcon?: ReactNode;
};

export function FormField({ label, error, hint, leadingIcon, id, className = "", ...props }: FormFieldProps) {
  const inputId = id ?? props.name;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const isPassword = props.type === "password";
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <div className="ea-field grid gap-2 text-sm font-medium text-ink">
      <label htmlFor={inputId}>{label}</label>
      <span className="relative block">
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          className={`ea-input min-h-11 rounded-xl border bg-paper px-3.5 py-2.5 text-base font-normal text-ink transition disabled:opacity-60 ${isPassword ? "pr-12" : ""} ${leadingIcon ? "ea-input--leading" : ""} ${className}`}
          {...props}
          type={isPassword && passwordVisible ? "text" : props.type}
        />
        {leadingIcon ? <span className="ea-field-leading" aria-hidden="true">{leadingIcon}</span> : null}
        {isPassword ? (
          <button
            type="button"
            className="ea-icon-button absolute inset-y-0 right-1"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={passwordVisible}
          >
            {passwordVisible ? <EyeOff className="size-4.5" aria-hidden="true" /> : <Eye className="size-4.5" aria-hidden="true" />}
          </button>
        ) : null}
      </span>
      {hint ? (
        <span id={hintId} className="text-xs font-normal leading-5 text-ink-soft">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="ea-field-error text-xs font-normal" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
