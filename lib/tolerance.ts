/**
 * Tolerance estimation based on rolling 14-day stimulant usage patterns.
 * Informational only -- does not alter dose recommendations directly
 * (changing doses in response to tolerance would be irresponsible without
 * medical supervision).
 *
 * Caffeine tolerance develops after ~3 days of consistent use (Nehlig 2018).
 * Amphetamine tolerance is slower but cumulative.
 *
 * For awareness only; not medical advice.
 */

import type { SubstanceType } from "./stimulant-calculator";

export interface DoseLogMinimal {
  substance: string;
  amountMg: number | null;
  loggedAt: Date;
}

export type ToleranceLevel = "none" | "low" | "moderate" | "elevated";

export interface ToleranceInfo {
  substance: SubstanceType;
  level: ToleranceLevel;
  /** 1.0 = no tolerance, up to ~1.3 for heavy daily use */
  multiplier: number;
  avgDailyMg: number;
  daysUsed: number;
  totalDays: number;
  message: string | null;
}

const DAILY_BASELINE_MG: Record<SubstanceType, number> = {
  CAFFEINE: 100,
  ADDERALL: 10,
  DEXEDRINE: 7.5,
  NICOTINE: 2,
};

const DEFAULT_DOSE_MG: Record<SubstanceType, number> = {
  CAFFEINE: 95,
  ADDERALL: 20,
  DEXEDRINE: 15,
  NICOTINE: 1,
};

/**
 * Group logs by calendar date and compute daily mg totals
 * for a specific substance over the trailing `days` window.
 */
function getDailyTotals(
  logs: DoseLogMinimal[],
  substance: SubstanceType,
  fromDate: Date,
  days: number,
): { date: string; totalMg: number }[] {
  const start = new Date(fromDate);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const buckets = new Map<string, number>();
  for (let d = 0; d < days; d++) {
    const dt = new Date(start);
    dt.setDate(dt.getDate() + d);
    buckets.set(dt.toISOString().slice(0, 10), 0);
  }

  for (const log of logs) {
    if (log.substance !== substance) continue;
    if (log.loggedAt < start || log.loggedAt > fromDate) continue;
    const key = log.loggedAt.toISOString().slice(0, 10);
    if (!buckets.has(key)) continue;
    const mg =
      log.amountMg != null && Number.isFinite(log.amountMg) && log.amountMg > 0
        ? log.amountMg
        : DEFAULT_DOSE_MG[substance] ?? 0;
    buckets.set(key, (buckets.get(key) ?? 0) + mg);
  }

  return Array.from(buckets.entries())
    .map(([date, totalMg]) => ({ date, totalMg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Estimate tolerance level for a single substance based on 14-day usage.
 */
export function getToleranceLevel(
  logs14d: DoseLogMinimal[],
  substance: SubstanceType,
  now?: Date,
): ToleranceInfo {
  const reference = now ?? new Date();
  const totals = getDailyTotals(logs14d, substance, reference, 14);
  const daysUsed = totals.filter((d) => d.totalMg > 0).length;
  const sumMg = totals.reduce((s, d) => s + d.totalMg, 0);
  const avgDailyMg = sumMg / 14;
  const baseline = DAILY_BASELINE_MG[substance];

  const ratio = baseline > 0 ? avgDailyMg / baseline : 0;
  let level: ToleranceLevel;
  let multiplier: number;
  let message: string | null = null;

  if (daysUsed <= 2 || ratio < 0.3) {
    level = "none";
    multiplier = 1.0;
  } else if (ratio < 1.0) {
    level = "low";
    multiplier = 1.05;
  } else if (ratio < 2.0) {
    level = "moderate";
    multiplier = 1.15;
    message = `Your 14-day average is ${Math.round(avgDailyMg)}mg/day. You may have moderate tolerance. A 2–3 day break can help restore sensitivity.`;
  } else {
    level = "elevated";
    multiplier = 1.3;
    message = `Your 14-day average is ${Math.round(avgDailyMg)}mg/day — well above baseline. Tolerance is likely elevated. Consider a 3–5 day reset for full sensitivity.`;
  }

  return {
    substance,
    level,
    multiplier,
    avgDailyMg: Math.round(avgDailyMg * 10) / 10,
    daysUsed,
    totalDays: 14,
    message,
  };
}

/**
 * Tolerance info for all four substances.
 */
export function getAllToleranceLevels(
  logs14d: DoseLogMinimal[],
  now?: Date,
): Record<SubstanceType, ToleranceInfo> {
  const substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"];
  const result = {} as Record<SubstanceType, ToleranceInfo>;
  for (const s of substances) {
    result[s] = getToleranceLevel(logs14d, s, now);
  }
  return result;
}
