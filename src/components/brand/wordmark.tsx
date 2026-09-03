import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-3 rounded-sm text-ink no-underline focus-visible:outline-2"
      aria-label="Ever After home"
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-full border border-gold font-serif text-sm italic text-wine"
      >
        EA
      </span>
      <span className="font-display text-[1.4rem] tracking-[0.04em]">Ever After</span>
    </Link>
  );
}
