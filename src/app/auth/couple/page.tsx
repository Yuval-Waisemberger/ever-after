import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = { title: "Couple sign in" };

export default async function CoupleAuthPage({ searchParams }: PageProps<"/auth/couple">) {
  const params = await searchParams;
  return (
    <AuthPage
      audience="couple"
      mode={params.mode === "login" ? "login" : "signup"}
      message={typeof params.message === "string" ? params.message : undefined}
    />
  );
}
