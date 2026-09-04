import Link from "next/link";
import type { ComponentProps } from "react";

type LinkButtonProps = ComponentProps<typeof Link> & {
  tone?: "primary" | "secondary" | "quiet";
};

const toneClasses = {
  primary:
    "border-wine bg-wine text-white hover:border-wine-dark hover:bg-wine-dark",
  secondary:
    "border-line bg-paper text-ink hover:border-gold hover:bg-paper-muted",
  quiet: "border-transparent bg-transparent text-wine hover:bg-wine/5",
};

export function LinkButton({
  className = "",
  tone = "primary",
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={`ea-button no-underline ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
