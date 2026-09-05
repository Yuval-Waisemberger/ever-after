import type { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "danger" | "waiting" | "neutral" | "progress";

const toneClass: Record<StatusTone, string> = {
  success: "ea-status-pill--success",
  warning: "ea-status-pill--warning",
  danger: "ea-status-pill--danger",
  waiting: "ea-status-pill--waiting",
  neutral: "ea-status-pill--neutral",
  progress: "ea-status-pill--progress",
};

export function StatusPill({ children, tone, className = "" }: {
  children: ReactNode;
  tone: StatusTone;
  className?: string;
}) {
  return <span className={`ea-status-pill ${toneClass[tone]} ${className}`}>{children}</span>;
}
