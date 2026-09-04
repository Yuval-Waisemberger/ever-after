import type { ComponentProps, ReactNode } from "react";

type FormFieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
};

export function FormField({ label, error, hint, id, className = "", ...props }: FormFieldProps) {
  const inputId = id ?? props.name;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <label className="ea-field grid gap-2 text-sm font-medium text-ink" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={`ea-input min-h-11 rounded-xl border bg-paper px-3.5 py-2.5 text-base font-normal text-ink transition disabled:opacity-60 ${className}`}
        {...props}
      />
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
    </label>
  );
}
