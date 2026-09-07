import { PageTransition } from "@/components/layout/page-transition";

export default function MarketplaceTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
