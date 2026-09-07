import Link from "next/link";
import type { ComponentProps } from "react";

type LinkButtonProps = ComponentProps<typeof Link> & {
  tone?: "primary" | "secondary" | "quiet";
};

const toneClasses = {
  primary: "ea-button--primary",
  secondary: "ea-button--secondary",
  quiet: "ea-button--quiet",
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
