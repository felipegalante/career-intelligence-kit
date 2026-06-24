// Recency scoring. Recent evidence counts more than old
// evidence: a skill used in the last two years is worth full credit; one last
// touched a decade ago is discounted. Evidence with no datable range gets a
// neutral 0.5 (we don't know — don't reward or punish).

export interface EvidenceDateRange {
  /** ISO date (YYYY-MM-DD) of the range start. */
  start: string;
  /** ISO date of the range end, or null if ongoing ("Present"). */
  end: string | null;
}

function monthsBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / (30.44 * 24 * 3600 * 1000));
}

/** Recency multiplier in [0,1] from how long ago the evidence's range ended. */
export function scoreRecency(dateRange: EvidenceDateRange | undefined, now: Date = new Date()): number {
  if (!dateRange) return 0.5;
  const end = dateRange.end ? new Date(dateRange.end) : now;
  const monthsAgo = monthsBetween(end, now);
  if (monthsAgo <= 24) return 1.0;
  if (monthsAgo <= 60) return 0.8;
  if (monthsAgo <= 96) return 0.6;
  return 0.4;
}
