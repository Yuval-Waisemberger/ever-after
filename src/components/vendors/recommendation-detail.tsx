import { Sparkles } from "lucide-react";
import type { RecommendationResult } from "@/lib/domain/recommendation";

export function RecommendationDetail({ recommendation }: { recommendation?: RecommendationResult | null }) {
  if (!recommendation?.isRecommended) return null;
  const reasons = recommendation.reasons.filter(reason => reason.earnedWeight > 0);
  if (!reasons.length) return null;
  return <details className="recommendation-detail">
    <summary className="recommendation-badge"><Sparkles size={13} aria-hidden="true" />Recommended for you</summary>
    <div className="recommendation-reasons"><h3>Why this match?</h3><ul>{reasons.map(reason => <li key={reason.dimension}>{reason.label.replaceAll("_", " ")}</li>)}</ul></div>
  </details>;
}
