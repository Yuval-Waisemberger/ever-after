import Link from "next/link";
import Image from "next/image";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="public-brand ea-wordmark"
      aria-label="Ever After home"
    >
      <Image src="/brand/ever-after-approved.png" alt="Ever After" width={1536} height={1024} sizes="280px" priority />
    </Link>
  );
}
