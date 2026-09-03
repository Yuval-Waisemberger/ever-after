import type { ReactNode } from "react";

export function DashboardCard({
  title,
  eyebrow,
  children,
  footer,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border bg-paper p-5 shadow-[0_10px_35px_rgb(77_52_33_/_6%)] ${className}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="font-display mt-1 text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
      {footer ? <div className="mt-5 border-t pt-4 text-sm">{footer}</div> : null}
    </section>
  );
}
