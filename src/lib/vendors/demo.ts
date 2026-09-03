import generatedVendors from "@/generated/marketplace-demo.json";
import type { MarketplaceVendor } from "./types";

// Local preview fallback only. Supabase remains the deployed source of truth.
// Regenerate this data and supabase/seed.sql together with `pnpm seed:generate`.
export const demoVendors = generatedVendors as MarketplaceVendor[];
