/**
 * Pharmacokinetic concentration model.
 * Models exponential elimination with a linear absorption phase.
 *
 * Core formula (post-absorption): C(t) = dose * e^(-0.693 * t / halfLife)
 * Absorption: linear ramp from 0 to dose over absorptionHours, then decay.
 *
 * References:
 * - Caffeine: Nehlig 2018, Fredholm et al. 1999 (half-life 3–7h, peak ~45min)
 * - Amphetamine IR: FDA/DailyMed (half-life 10–13h, peak ~2–3h)
 * - Nicotine: NCBI (half-life 1–2h, peak within minutes)
 *
 * For awareness only; not medical advice.
 */

import { SUBSTANCE_CONFIG, type SubstanceType } from "./stimulant-calculator";

export interface DoseLog {
  substance: string;
  amountMg: number | null;
  loggedAt: Date;
}

export interface ConcentrationPoint {
  time: number; // unix ms
  mgActive: number;
}

const DEFAULT_DOSE_MG: Record<SubstanceType, number> = {
  CAFFEINE: 95,
  ADDERALL: 20,
  DEXEDRINE: 15,
  NICOTINE: 1,
};

const ABSORPTION_HOURS: Record<SubstanceType, number> = {
  CAFFEINE: 0.75,
  ADDERALL: 1.5,
  DEXEDRINE: 1.5,
  NICOTINE: 0.08,
};

function getDoseMg(log: DoseLog): number {
  if (log.amountMg != null && Number.isFinite(log.amountMg) && log.amountMg > 0) {
    return log.amountMg;
  }
  return DEFAULT_DOSE_MG[log.substance as SubstanceType] ?? 0;
}

/**
 * Concentration contribution of a single dose at a given time,
 * accounting for a linear absorption ramp then exponential decay.
 */
function singleDoseConcentration(
  doseMg: number,
  doseTime: number,
  targetTime: number,
  halfLifeHours: number,
  absorptionHours: number,
): number {
  const elapsedMs = targetTime - doseTime;
  if (elapsedMs < 0) return 0;
  const elapsedH = elapsedMs / 3_600_000;

  if (elapsedH <= absorptionHours) {
    const fractionAbsorbed = elapsedH / absorptionHours;
    return doseMg * fractionAbsorbed;
  }

  const decayH = elapsedH - absorptionHours;
  const k = 0.693 / halfLifeHours;
  return doseMg * Math.exp(-k * decayH);
}

/**
 * Total estimated active mg of a substance at a given time,
 * summing contributions from all relevant logged doses.
 */
export function getConcentrationAtTime(
  logs: DoseLog[],
  substance: SubstanceType,
  targetTime: Date,
  halfLifeHours?: number,
): number {
  const hl = halfLifeHours ?? SUBSTANCE_CONFIG[substance].halfLifeHours;
  const abs = ABSORPTION_HOURS[substance] ?? 0.75;
  const target = targetTime.getTime();
  let total = 0;

  for (const log of logs) {
    if (log.substance !== substance) continue;
    const doseMg = getDoseMg(log);
    if (doseMg <= 0) continue;
    total += singleDoseConcentration(doseMg, log.loggedAt.getTime(), target, hl, abs);
  }
  return Math.round(total * 100) / 100;
}

/**
 * Generate a concentration curve (array of time/mg points) for charting.
 * stepMinutes controls resolution (default 10 min).
 */
export function getConcentrationCurve(
  logs: DoseLog[],
  substance: SubstanceType,
  startTime: Date,
  endTime: Date,
  halfLifeHours?: number,
  stepMinutes = 10,
): ConcentrationPoint[] {
  const hl = halfLifeHours ?? SUBSTANCE_CONFIG[substance].halfLifeHours;
  const abs = ABSORPTION_HOURS[substance] ?? 0.75;
  const points: ConcentrationPoint[] = [];
  const step = stepMinutes * 60_000;
  const relevantLogs = logs.filter((l) => l.substance === substance);

  for (let t = startTime.getTime(); t <= endTime.getTime(); t += step) {
    let total = 0;
    for (const log of relevantLogs) {
      const doseMg = getDoseMg(log);
      if (doseMg <= 0) continue;
      total += singleDoseConcentration(doseMg, log.loggedAt.getTime(), t, hl, abs);
    }
    points.push({ time: t, mgActive: Math.round(total * 100) / 100 });
  }
  return points;
}

/**
 * Find the earliest time after `fromTime` when total active mg drops
 * below `thresholdMg`. Returns null if already below or never crosses
 * within a 48h window.
 */
export function getTimeUntilBelow(
  logs: DoseLog[],
  substance: SubstanceType,
  fromTime: Date,
  thresholdMg: number,
  halfLifeHours?: number,
): Date | null {
  const hl = halfLifeHours ?? SUBSTANCE_CONFIG[substance].halfLifeHours;
  const abs = ABSORPTION_HOURS[substance] ?? 0.75;
  const relevantLogs = logs.filter((l) => l.substance === substance);
  const step = 5 * 60_000; // 5 min resolution
  const maxSearch = 48 * 3_600_000;

  const currentLevel = getConcentrationAtTime(logs, substance, fromTime, hl);
  if (currentLevel <= thresholdMg) return null;

  for (let offset = step; offset <= maxSearch; offset += step) {
    const t = fromTime.getTime() + offset;
    let total = 0;
    for (const log of relevantLogs) {
      const doseMg = getDoseMg(log);
      if (doseMg <= 0) continue;
      total += singleDoseConcentration(doseMg, log.loggedAt.getTime(), t, hl, abs);
    }
    if (total <= thresholdMg) {
      return new Date(t);
    }
  }
  return null;
}

/**
 * Sleep-readiness: find when ALL substances drop below their sleep-safe thresholds.
 * Thresholds approximate levels unlikely to disrupt sleep onset.
 */
const SLEEP_SAFE_MG: Record<SubstanceType, number> = {
  CAFFEINE: 50,
  ADDERALL: 5,
  DEXEDRINE: 3,
  NICOTINE: 0.3,
};

export function getSleepReadinessTime(
  logs: DoseLog[],
  fromTime: Date,
  halfLifeOverrides?: Partial<Record<SubstanceType, number>>,
): Date | null {
  let latest: Date | null = null;
  const substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"];

  for (const substance of substances) {
    const hl = halfLifeOverrides?.[substance] ?? SUBSTANCE_CONFIG[substance].halfLifeHours;
    const clearTime = getTimeUntilBelow(logs, substance, fromTime, SLEEP_SAFE_MG[substance], hl);
    if (clearTime && (!latest || clearTime > latest)) {
      latest = clearTime;
    }
  }
  return latest;
}

export { DEFAULT_DOSE_MG, ABSORPTION_HOURS, SLEEP_SAFE_MG };
