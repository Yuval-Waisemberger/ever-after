import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  // Keep the project's original local AGENTS.md immutable.
  agentRules: false,
  images: {
    localPatterns: [
      // Content-versioned demo covers; other local assets retain query-free access.
      { pathname: "/demo-marketplace/**" },
      { pathname: "/**", search: "" },
    ],
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
