import { PlanningReveal } from "@/components/planning/reveal";
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
    <PlanningReveal className="dashboard-reveal"><section className={`ea-surface ea-dashboard-card rounded-2xl border bg-paper p-5 ${className}`}>
      <header className="dashboard-card-heading"><div>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="font-display mt-1 text-2xl">{title}</h2>
      </div>{footer ? <div className="dashboard-card-action text-sm">{footer}</div> : null}</header>
      <div className="dashboard-card-body mt-5">{children}</div>
    </section></PlanningReveal>
  );
}
