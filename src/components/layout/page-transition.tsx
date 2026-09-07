import type { ReactNode } from "react";

/** Used below persistent layouts. No client key, timer or delayed rendering. */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="ea-page-transition">{children}</div>;
}
