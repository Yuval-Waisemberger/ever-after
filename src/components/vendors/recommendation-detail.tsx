import { Sparkles } from "lucide-react";
import type { RecommendationResult } from "@/lib/domain/recommendation";

export function RecommendationBadge({ recommendation }: { recommendation?: RecommendationResult | null }) {
  if (!recommendation?.isRecommended) return null;
  return <span className="recommendation-badge">
    <Sparkles size={13} aria-hidden="true" />Recommended for you
  </span>;
}
