import type { Metadata } from "next";
import "./globals.css";
import "./eligible-consistency.css";
import "./product.css";
import "./public.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_SITE_URL
      : "http://localhost:3000",
  ),
  title: {
    default: "Ever After",
    template: "%s | Ever After",
  },
  description:
    "A calm, connected wedding workspace for tasks, vendors, budget, payments, and thoughtful guidance.",
  openGraph: {
    title: "Ever After — Your wedding, beautifully organized",
    description:
      "Plan tasks, discover vendors, track your budget, and get guidance in one connected workspace.",
    type: "website",
    images: [
      {
        url: "/ever-after-social-card.png",
        width: 1730,
        height: 909,
        alt: "Ever After — Your wedding. One place. Less chaos.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ever After — Your wedding, beautifully organized",
    description:
      "Plan tasks, discover vendors, track your budget, and get guidance in one connected workspace.",
    images: ["/ever-after-social-card.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
