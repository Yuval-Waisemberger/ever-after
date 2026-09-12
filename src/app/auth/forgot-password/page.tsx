import type { Metadata } from "next";
import { ForgotPasswordPanel } from "@/components/auth/password-recovery-panel";
import { RecoveryPage } from "@/components/auth/recovery-page";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const audience = params.audience === "couple" || params.audience === "vendor" ? params.audience : undefined;
  return <RecoveryPage publicNavigation authAudience={audience}><ForgotPasswordPanel audience={audience} /></RecoveryPage>;
}
