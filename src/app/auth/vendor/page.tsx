import { LandingNavigation } from "@/components/public/landing-navigation";
import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = { title: "Vendor sign in" };

export default async function VendorAuthPage({ searchParams }: PageProps<"/auth/vendor">) {
  const params = await searchParams;
  return (
    <div className="vendor-auth-presentation"><LandingNavigation context="auth" />
    <AuthPage
      audience="vendor"
      mode={params.mode === "login" ? "login" : "signup"}
      message={typeof params.message === "string" ? params.message : undefined}
    /></div>
  );
}
