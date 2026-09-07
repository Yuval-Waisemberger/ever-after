import { PageTransition } from "@/components/layout/page-transition";

export default function CoupleTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
