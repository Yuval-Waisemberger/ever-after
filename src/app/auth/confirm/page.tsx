import type { Metadata } from "next";
import { RecoveryPage } from "@/components/auth/recovery-page";
import { TokenConfirmationPanel } from "@/components/auth/token-confirmation-panel";
import { confirmEmailToken } from "@/lib/actions/email-confirmation";
import { parseConfirmationRequest } from "@/lib/auth/email-confirmation";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function ConfirmEmailPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const request = parseConfirmationRequest(await searchParams);

  if (!request) {
    return <RecoveryPage><TokenConfirmationPanel /></RecoveryPage>;
  }

  const action = confirmEmailToken.bind(null, request.tokenHash, request.type);
  return <RecoveryPage><TokenConfirmationPanel type={request.type} action={action} /></RecoveryPage>;
}
