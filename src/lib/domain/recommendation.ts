export type WeddingForRecommendation = {
  preferredArea?: string | null;
  availableBudgetMinor?: number | null;
  styles?: string[] | null;
  guestCount?: number | null;
  eventType?: string | null;
};

export type VendorForRecommendation = {
  serviceAreas?: string[] | null;
  minPriceMinor?: number | null;
  maxPriceMinor?: number | null;
  styles?: string[] | null;
  minGuestCapacity?: number | null;
  maxGuestCapacity?: number | null;
  eventTypes?: string[] | null;
  ratingAverage?: number | null;
};

export type MatchDimension =
  | "area"
  | "budget"
  | "style"
  | "capacity"
  | "eventType"
  | "rating";

export type MatchReason = {
  dimension: MatchDimension;
  label: string;
  earnedWeight: number;
  availableWeight: number;
};

export type RecommendationResult = {
  score: number | null;
  isRecommended: boolean;
  applicableDimensions: MatchDimension[];
  reasons: MatchReason[];
};

const WEIGHTS: Record<MatchDimension, number> = {
  area: 25,
  budget: 20,
  style: 20,
  capacity: 15,
  eventType: 10,
  rating: 10,
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US");

function includesNormalized(values: string[] | null | undefined, target: string): boolean {
  const normalizedTarget = normalize(target);
  return (values ?? []).some((value) => normalize(value) === normalizedTarget);
}

export function calculateRecommendation(
  wedding: WeddingForRecommendation,
  vendor: VendorForRecommendation,
): RecommendationResult {
  const reasons: MatchReason[] = [];
  const applicableDimensions: MatchDimension[] = [];
  let availableWeight = 0;
  let earnedWeight = 0;

  const add = (
    dimension: MatchDimension,
    matchRatio: number,
    label: string,
  ) => {
    const weight = WEIGHTS[dimension];
    applicableDimensions.push(dimension);
    availableWeight += weight;
    const earned = weight * Math.max(0, Math.min(matchRatio, 1));
    earnedWeight += earned;
    if (earned > 0) {
      reasons.push({ dimension, label, earnedWeight: earned, availableWeight: weight });
    }
  };

  if (wedding.preferredArea && (vendor.serviceAreas?.length ?? 0) > 0) {
    const matches =
      normalize(wedding.preferredArea) === "flexible" ||
      includesNormalized(vendor.serviceAreas, wedding.preferredArea) ||
      includesNormalized(vendor.serviceAreas, "flexible") ||
      includesNormalized(vendor.serviceAreas, "All Israel");
    add("area", matches ? 1 : 0, matches ? `Serves ${wedding.preferredArea}` : "Area mismatch");
  }

  if (
    wedding.availableBudgetMinor != null &&
    wedding.availableBudgetMinor >= 0 &&
    vendor.minPriceMinor != null
  ) {
    const min = Math.max(0, vendor.minPriceMinor);
    const max = Math.max(min, vendor.maxPriceMinor ?? min);
    const ratio = max <= wedding.availableBudgetMinor ? 1 : min <= wedding.availableBudgetMinor ? 0.5 : 0;
    add("budget", ratio, ratio === 1 ? "Fits the available budget" : "Partly fits the available budget");
  }

  if ((wedding.styles?.length ?? 0) > 0 && (vendor.styles?.length ?? 0) > 0) {
    const weddingStyles = new Set(wedding.styles?.map(normalize));
    const overlap = vendor.styles?.filter((style) => weddingStyles.has(normalize(style))) ?? [];
    add("style", overlap.length > 0 ? 1 : 0, overlap.length > 0 ? `Matches ${overlap[0]} style` : "Style mismatch");
  }

  if (
    wedding.guestCount != null &&
    (vendor.minGuestCapacity != null || vendor.maxGuestCapacity != null)
  ) {
    const min = vendor.minGuestCapacity ?? 0;
    const max = vendor.maxGuestCapacity ?? Number.POSITIVE_INFINITY;
    const matches = wedding.guestCount >= min && wedding.guestCount <= max;
    add("capacity", matches ? 1 : 0, matches ? `Fits ${wedding.guestCount} guests` : "Capacity mismatch");
  }

  if (wedding.eventType && (vendor.eventTypes?.length ?? 0) > 0) {
    const matches = includesNormalized(vendor.eventTypes, wedding.eventType);
    add("eventType", matches ? 1 : 0, matches ? `Supports ${wedding.eventType}` : "Event type mismatch");
  }

  if (vendor.ratingAverage != null) {
    const ratio = vendor.ratingAverage >= 4.5 ? 1 : vendor.ratingAverage >= 4 ? 0.5 : 0;
    add("rating", ratio, ratio === 1 ? "Highly rated" : "Well rated");
  }

  const score = availableWeight === 0 ? null : Math.round((earnedWeight / availableWeight) * 100);
  const substantiveEvidence = applicableDimensions.filter((dimension) => dimension !== "rating").length;

  return {
    score,
    isRecommended: score != null && score >= 75 && substantiveEvidence >= 2,
    applicableDimensions,
    reasons: reasons
      .filter((reason) => reason.earnedWeight > 0)
      .toSorted((left, right) => right.earnedWeight - left.earnedWeight),
  };
}
