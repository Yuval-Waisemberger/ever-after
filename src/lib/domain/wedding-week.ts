function utcDate(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function daysUntilWedding(weddingDate: string | null, today = new Date()): number | null {
  if (!weddingDate) return null;
  return Math.round((utcDate(weddingDate).getTime() - utcDate(today).getTime()) / 86_400_000);
}

export function isWeddingWeek(weddingDate: string | null, today = new Date()): boolean {
  const days = daysUntilWedding(weddingDate, today);
  return days != null && days >= 0 && days <= 7;
}
