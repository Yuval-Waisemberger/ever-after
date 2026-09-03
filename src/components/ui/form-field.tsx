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
    <label className="grid gap-2 text-sm font-semibold text-ink" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={`min-h-11 rounded-xl border bg-paper px-3.5 py-2.5 text-base font-normal text-ink shadow-sm outline-none transition focus:border-wine focus:ring-2 focus:ring-wine/10 disabled:opacity-60 ${className}`}
        {...props}
      />
      {hint ? (
        <span id={hintId} className="text-xs font-normal leading-5 text-ink-soft">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="text-xs font-normal text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
