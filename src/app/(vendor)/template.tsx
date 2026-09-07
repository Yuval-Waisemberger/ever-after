import { PageTransition } from "@/components/layout/page-transition";

export default function VendorTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
