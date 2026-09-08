import type { AnchorHTMLAttributes } from "react";
export default function Link({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href} onClick={event => { onClick?.(event); if (!href?.startsWith("/vendor") || event.metaKey || event.ctrlKey) return; event.preventDefault(); history.pushState({}, "", href); window.dispatchEvent(new Event("fixture-refresh")); window.dispatchEvent(new Event("hashchange")); }} />;
}
