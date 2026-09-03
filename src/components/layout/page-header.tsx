import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="font-display mt-2 text-4xl leading-tight tracking-tight sm:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl leading-7 text-ink-soft">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
