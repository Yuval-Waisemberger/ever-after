import Link from "next/link";
import Image from "next/image";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="public-brand ea-wordmark"
      aria-label="Ever After home"
    >
      <Image src="/brand/ever-after-logo-black.webp" alt="Ever After" width={2172} height={724} sizes="196px" priority />
    </Link>
  );
}
