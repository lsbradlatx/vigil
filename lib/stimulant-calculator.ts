/**
 * Time-based suggestions for stimulant use. For awareness only; not medical advice.
 * Two modes: health (stricter) and productivity (more permissive), both within recommended limits.
 *
 * Scientific / regulatory references for parameters:
 * - Caffeine: FDA 400 mg/day safe for healthy adults; sensitivity varies by body weight, medications, conditions.
 *   PK: half-life ~4–5 h, peak ~45 min–1 h (NCBI/NIH pharmacokinetic reviews).
 * - Amphetamine (Adderall/Dexedrine): d-amphetamine half-life ~10–11 h, IR peak ~3 h (FDA label / DailyMed).
 *   Parameters here use typical immediate-release values.
 * - Nicotine: half-life ~1–2 h, peak within minutes (NCBI).
 */

import type { HealthProfile } from "./health-profile";
import { isSubstanceAllergic, getWeightBasedCaffeineMaxMg } from "./health-profile";
import { getConcentrationAtTime, getTimeUntilBelow, SLEEP_SAFE_MG, type DoseLog } from "./pharmacokinetics";
import type { ActiveInteraction } from "./interactions";
import { getInteractionAdjustments } from "./interactions";

export type SubstanceType = "CAFFEINE" | "ADDERALL" | "DEXEDRINE" | "NICOTINE";

export type OptimizationMode = "health" | "productivity";

/** Absolute recommended limits (never exceeded in either mode). */
export interface SubstanceLimits {
  /** Max doses per 24h (common guidelines). */
  maxDosesPerDay: number;
  /** Max mg per 24h when amount is tracked (e.g. 400 caffeine, 60 adderall). */
  maxMgPerDay: number;
  /** Minimum hours between doses. */
  minSpacingHours: number;
  /** Latest cutoff: no dose after (sleepBy - this many hours). */
  minCutoffHoursBeforeSleep: number;
  label: string;
}

/** Mode-specific parameters (within limits). Health = stricter, productivity = more permissive. */
export interface SubstanceModeParams {
  cutoffHoursBeforeSleep: number;
  spacingHours: number;
  maxDosesPerDay: number;
  /** Max mg per day in this mode (health lower, productivity higher). */
  maxMgPerDay: number;
}

export interface SubstanceConfig {
  halfLifeHours: number;
  peakHours: number;
  label: string;
  /** Absolute limits; recommendations never exceed these. */
  limits: SubstanceLimits;
  /** Health mode: earlier cutoff, longer spacing, fewer doses. */
  health: SubstanceModeParams;
  /** Productivity mode: later cutoff, shorter spacing, more doses (still within limits). */
  productivity: SubstanceModeParams;
}

export const SUBSTANCE_CONFIG: Record<SubstanceType, SubstanceConfig> = {
  CAFFEINE: {
    halfLifeHours: 5,
    peakHours: 1,
    label: "Caffeine",
    limits: {
      maxDosesPerDay: 4,
      maxMgPerDay: 400,
      minSpacingHours: 3,
      minCutoffHoursBeforeSleep: 6,
      label: "Caffeine",
    },
    health: {
      cutoffHoursBeforeSleep: 8,
      spacingHours: 5,
      maxDosesPerDay: 2,
      maxMgPerDay: 200,
    },
    productivity: {
      cutoffHoursBeforeSleep: 6,
      spacingHours: 4,
      maxDosesPerDay: 4,
      maxMgPerDay: 400,
    },
  },
  ADDERALL: {
    halfLifeHours: 11,
    peakHours: 2,
    label: "Adderall",
    limits: {
      maxDosesPerDay: 2,
      maxMgPerDay: 60,
      minSpacingHours: 8,
      minCutoffHoursBeforeSleep: 10,
      label: "Adderall",
    },
    health: {
      cutoffHoursBeforeSleep: 14,
      spacingHours: 12,
      maxDosesPerDay: 1,
      maxMgPerDay: 30,
    },
    productivity: {
      cutoffHoursBeforeSleep: 10,
      spacingHours: 8,
      maxDosesPerDay: 2,
      maxMgPerDay: 60,
    },
  },
  DEXEDRINE: {
    halfLifeHours: 11,
    peakHours: 2,
    label: "Dexedrine",
    limits: {
      maxDosesPerDay: 2,
      maxMgPerDay: 40,
      minSpacingHours: 8,
      minCutoffHoursBeforeSleep: 10,
      label: "Dexedrine",
    },
    health: {
      cutoffHoursBeforeSleep: 14,
      spacingHours: 12,
      maxDosesPerDay: 1,
      maxMgPerDay: 20,
    },
    productivity: {
      cutoffHoursBeforeSleep: 10,
      spacingHours: 8,
      maxDosesPerDay: 2,
      maxMgPerDay: 40,
    },
  },
  NICOTINE: {
    halfLifeHours: 2,
    peakHours: 0.25,
    label: "Nicotine",
    limits: {
      maxDosesPerDay: 8,
      maxMgPerDay: 24, // ~1mg per typical dose if counting mg; or use as "dose units"
      minSpacingHours: 2,
      minCutoffHoursBeforeSleep: 3,
      label: "Nicotine",
    },
    health: {
      cutoffHoursBeforeSleep: 4,
      spacingHours: 3,
      maxDosesPerDay: 5,
      maxMgPerDay: 15,
    },
    productivity: {
      cutoffHoursBeforeSleep: 3,
      spacingHours: 2,
      maxDosesPerDay: 8,
      maxMgPerDay: 24,
    },
  },
};

export interface CutoffResult {
  substance: SubstanceType;
  label: string;
  cutoffTime: string;
  message: string;
  /** Max recommended doses per day for current mode. */
  maxDosesPerDay: number;
}

export interface NextDoseWindow {
  substance: SubstanceType;
  label: string;
  windowStart: string;
  windowEnd: string;
  message: string;
  /** True if user is at or over recommended limit for today. */
  atLimit?: boolean;
  /** Total mg logged today for this substance (if amounts tracked). */
  totalMgToday?: number;
  /** Max recommended mg today for current mode. */
  maxMgPerDay?: number;
  /** Remaining mg allowed today (max - total), 0 if at limit. */
  remainingMgToday?: number;
  /** Doses taken in last 24h for this substance (for display / over-limit styling). */
  dosesToday?: number;
  /** Current estimated active mg from pharmacokinetic model. */
  currentMgActive?: number;
  /** Half-life used (may be personalized). */
  halfLifeUsed?: number;
  /** Interaction-adjusted effective max mg for this substance. */
  adjustedMaxMg?: number;
}

/** Government/absolute max limits per substance (e.g. FDA-style ceilings). Exceed = show daily dosage in red. */
export function getGovernmentLimits(): Record<
  SubstanceType,
  { maxDosesPerDay: number; maxMgPerDay: number }
> {
  const out = {} as Record<SubstanceType, { maxDosesPerDay: number; maxMgPerDay: number }>;
  for (const substance of ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"] as SubstanceType[]) {
    const limits = SUBSTANCE_CONFIG[substance].limits;
    out[substance] = {
      maxDosesPerDay: limits.maxDosesPerDay,
      maxMgPerDay: limits.maxMgPerDay,
    };
  }
  return out;
}

/**
 * Given a "sleep by" time and mode, returns cutoff times per substance (within recommended limits).
 * When profile is provided and lists an allergy for a substance, that substance is skipped.
 */
export function getCutoffTimes(
  sleepByDate: Date,
  mode: OptimizationMode,
  substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"],
  profile?: HealthProfile | null
): CutoffResult[] {
  const results: CutoffResult[] = [];
  for (const substance of substances) {
    if (profile && isSubstanceAllergic(profile, substance)) continue;
    const config = SUBSTANCE_CONFIG[substance];
    const params = config[mode];
    const cutoff = new Date(sleepByDate);
    cutoff.setHours(
      cutoff.getHours() - params.cutoffHoursBeforeSleep,
      cutoff.getMinutes(),
      0,
      0
    );
    const cutoffTime = cutoff.toTimeString().slice(0, 5);
    results.push({
      substance,
      label: config.label,
      cutoffTime,
      message: `No ${config.label.toLowerCase()} after ${formatTime(cutoff)}`,
      maxDosesPerDay: params.maxDosesPerDay,
    });
  }
  return results;
}

/**
 * Count doses per substance in the last 24h from now.
 */
export function countDosesLast24h(
  logs: { substance: string; loggedAt: Date }[],
  now: Date
): Record<SubstanceType, number> {
  const dayAgo = new Date(now);
  dayAgo.setDate(dayAgo.getDate() - 1);
  const counts: Record<SubstanceType, number> = {
    CAFFEINE: 0,
    ADDERALL: 0,
    DEXEDRINE: 0,
    NICOTINE: 0,
  };
  for (const log of logs) {
    if (log.loggedAt >= dayAgo && log.substance in counts) {
      counts[log.substance as SubstanceType]++;
    }
  }
  return counts;
}

/**
 * Sum total mg per substance in the last 24h. Logs without amountMg are not counted in the sum.
 */
export function sumTotalMgLast24h(
  logs: { substance: string; loggedAt: Date; amountMg: number | null }[],
  now: Date
): Record<SubstanceType, number> {
  const dayAgo = new Date(now);
  dayAgo.setDate(dayAgo.getDate() - 1);
  const sums: Record<SubstanceType, number> = {
    CAFFEINE: 0,
    ADDERALL: 0,
    DEXEDRINE: 0,
    NICOTINE: 0,
  };
  for (const log of logs) {
    if (log.loggedAt >= dayAgo && log.substance in sums && log.amountMg != null && Number.isFinite(log.amountMg)) {
      sums[log.substance as SubstanceType] += log.amountMg;
    }
  }
  return sums;
}

/**
 * Concentration-aware options for next-dose calculation.
 * If provided, the engine uses pharmacokinetic modeling; otherwise falls back to spacing rules.
 */
export interface ConcentrationOptions {
  /** All dose logs (not just last 24h) for concentration modeling. */
  allLogs: DoseLog[];
  /** Personalized half-lives per substance (from health-profile.ts). */
  halfLives?: Partial<Record<SubstanceType, number>>;
  /** Active interactions (from interactions.ts). */
  interactions?: ActiveInteraction[];
}

/**
 * Threshold at which we consider blood level low enough for a new dose.
 * Roughly 30% of a "standard" dose per substance.
 */
const REDOSE_THRESHOLD_MG: Record<SubstanceType, number> = {
  CAFFEINE: 30,
  ADDERALL: 6,
  DEXEDRINE: 5,
  NICOTINE: 0.3,
};

/**
 * Concentration-aware next-dose recommendations.
 *
 * When `concentrationOptions` is supplied, the engine calculates current estimated
 * blood level and uses the pharmacokinetic model to determine when levels drop
 * below re-dose thresholds. It also applies interaction adjustments to max-mg limits.
 *
 * Falls back to the simpler spacing-based logic when concentration data is unavailable.
 */
export function getNextDoseWindows(
  lastDoseBySubstance: Partial<Record<SubstanceType, Date>>,
  now: Date,
  mode: OptimizationMode,
  dosesTodayBySubstance: Record<SubstanceType, number>,
  sleepByDate: Date,
  totalMgTodayBySubstance?: Partial<Record<SubstanceType, number>>,
  lastDoseAmountMgBySubstance?: Partial<Record<SubstanceType, number>>,
  profile?: HealthProfile | null,
  concentrationOptions?: ConcentrationOptions,
): NextDoseWindow[] {
  const results: NextDoseWindow[] = [];
  const substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"];
  const usePK = concentrationOptions && concentrationOptions.allLogs.length > 0;

  for (const substance of substances) {
    const config = SUBSTANCE_CONFIG[substance];
    const params = config[mode];
    const hl = concentrationOptions?.halfLives?.[substance] ?? config.halfLifeHours;

    // Apply interaction adjustments to max mg
    const ixAdj = concentrationOptions?.interactions
      ? getInteractionAdjustments(concentrationOptions.interactions, substance)
      : { halfLifeMultiplier: 1, maxMgMultiplier: 1 };
    const adjustedHl = hl * ixAdj.halfLifeMultiplier;

    const weightBasedCaffeine = substance === "CAFFEINE" ? getWeightBasedCaffeineMaxMg(profile) : null;
    let effectiveMaxMgPerDay = weightBasedCaffeine != null
      ? Math.min(params.maxMgPerDay, weightBasedCaffeine)
      : params.maxMgPerDay;
    effectiveMaxMgPerDay = Math.round(effectiveMaxMgPerDay * ixAdj.maxMgMultiplier);

    // Concentration right now
    let currentMgActive: number | undefined;
    if (usePK) {
      currentMgActive = getConcentrationAtTime(
        concentrationOptions.allLogs, substance, now, adjustedHl,
      );
    }

    if (profile && isSubstanceAllergic(profile, substance)) {
      results.push({
        substance,
        label: config.label,
        windowStart: now.toISOString(),
        windowEnd: now.toISOString(),
        message: "Not recommended: you listed an allergy. Discuss with your doctor.",
        atLimit: true,
        dosesToday: dosesTodayBySubstance[substance] ?? 0,
        currentMgActive,
        halfLifeUsed: adjustedHl,
      });
      continue;
    }

    const dosesToday = dosesTodayBySubstance[substance] ?? 0;
    const totalMg = totalMgTodayBySubstance?.[substance] ?? 0;
    const lastDoseMg = lastDoseAmountMgBySubstance?.[substance];
    const hasAmountData = totalMg > 0 || totalMgTodayBySubstance != null;

    const atLimitByDose = dosesToday >= params.maxDosesPerDay;
    const atLimitByMg = hasAmountData && totalMg >= effectiveMaxMgPerDay;
    const atLimit = atLimitByDose || atLimitByMg;
    const remainingMg = Math.max(0, effectiveMaxMgPerDay - totalMg);

    if (atLimit) {
      results.push({
        substance,
        label: config.label,
        windowStart: now.toISOString(),
        windowEnd: now.toISOString(),
        message: "At recommended limit. Wait until tomorrow.",
        atLimit: true,
        totalMgToday: totalMg || undefined,
        maxMgPerDay: effectiveMaxMgPerDay,
        remainingMgToday: 0,
        dosesToday,
        currentMgActive,
        halfLifeUsed: adjustedHl,
        adjustedMaxMg: effectiveMaxMgPerDay !== params.maxMgPerDay ? effectiveMaxMgPerDay : undefined,
      });
      continue;
    }

    const lastDose = lastDoseBySubstance[substance];
    let windowStart: Date;
    let windowEnd: Date;
    let message: string;

    if (usePK && currentMgActive != null && currentMgActive > REDOSE_THRESHOLD_MG[substance]) {
      // Use PK model: find when concentration drops below redose threshold
      const dropTime = getTimeUntilBelow(
        concentrationOptions.allLogs, substance, now,
        REDOSE_THRESHOLD_MG[substance], adjustedHl,
      );

      if (dropTime && dropTime > now) {
        windowStart = dropTime;
        windowEnd = new Date(dropTime.getTime() + 3_600_000);
        message = `Estimated ${config.label.toLowerCase()} level: ~${Math.round(currentMgActive)}mg active. `
          + `Safe to redose after ${formatTime(dropTime)} when level drops below ${REDOSE_THRESHOLD_MG[substance]}mg.`;
      } else {
        windowStart = new Date(now);
        windowEnd = new Date(now.getTime() + 3_600_000);
        message = `Estimated ${config.label.toLowerCase()} level: ~${Math.round(currentMgActive)}mg active. OK to take now.`;
      }
    } else if (!lastDose) {
      windowStart = new Date(now);
      windowEnd = new Date(now.getTime() + 3_600_000);
      const levelNote = currentMgActive != null && currentMgActive > 0
        ? ` Current level: ~${Math.round(currentMgActive)}mg.`
        : "";
      message = `No recent ${config.label.toLowerCase()} logged.${levelNote} You can take some now; peak in ~${config.peakHours}h.`;
    } else {
      // Fallback: spacing-based logic
      let minSpacing = params.spacingHours;
      if (lastDoseMg != null && lastDoseMg > 0 && substance === "CAFFEINE" && lastDoseMg > 100) {
        const extraHours = Math.min(2, Math.floor((lastDoseMg - 100) / 100));
        minSpacing = params.spacingHours + extraHours;
      } else if (lastDoseMg != null && lastDoseMg > 0 && (substance === "ADDERALL" || substance === "DEXEDRINE") && lastDoseMg > 20) {
        const extraHours = lastDoseMg > 30 ? 2 : 1;
        minSpacing = params.spacingHours + extraHours;
      }

      const elapsedHours = (now.getTime() - lastDose.getTime()) / 3_600_000;

      if (elapsedHours < minSpacing) {
        windowStart = new Date(lastDose.getTime() + minSpacing * 3_600_000);
        windowEnd = new Date(windowStart.getTime() + 3_600_000);
        if (windowEnd < now) {
          windowStart = new Date(now);
          windowEnd = new Date(now.getTime() + 3_600_000);
        }
        const spacingNote = minSpacing > params.spacingHours && lastDoseMg != null
          ? ` (${minSpacing}h after last dose of ${lastDoseMg}mg)`
          : ` (${minSpacing}h after last dose)`;
        const levelNote = currentMgActive != null ? ` Level: ~${Math.round(currentMgActive)}mg.` : "";
        message = `Next ${config.label.toLowerCase()} suggested after ${formatTime(windowStart)}${spacingNote}.${levelNote}`;
      } else {
        windowStart = new Date(now);
        windowEnd = new Date(now.getTime() + 3_600_000);
        const levelNote = currentMgActive != null ? ` Current level: ~${Math.round(currentMgActive)}mg.` : "";
        message = `OK to take ${config.label.toLowerCase()} now; peak in ~${config.peakHours}h.${levelNote}`;
      }
    }

    if (isWithinSleepToFiveWindow(windowStart, sleepByDate)) {
      message = `Next ${config.label.toLowerCase()} suggestion falls during sleep hours. Wait until after 5:00 AM local time.`;
    }

    results.push({
      substance,
      label: config.label,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      message,
      totalMgToday: totalMg || undefined,
      maxMgPerDay: effectiveMaxMgPerDay,
      remainingMgToday: remainingMg,
      dosesToday,
      currentMgActive,
      halfLifeUsed: adjustedHl,
      adjustedMaxMg: effectiveMaxMgPerDay !== params.maxMgPerDay ? effectiveMaxMgPerDay : undefined,
    });
  }
  return results;
}

/**
 * Sleep readiness: when will all stimulants drop below sleep-safe levels?
 */
export function getSleepReadiness(
  logs: DoseLog[],
  now: Date,
  halfLives?: Partial<Record<SubstanceType, number>>,
): { readyAt: string | null; message: string } {
  const substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"];
  let latest: Date | null = null;

  for (const substance of substances) {
    const hl = halfLives?.[substance] ?? SUBSTANCE_CONFIG[substance].halfLifeHours;
    const clearTime = getTimeUntilBelow(logs, substance, now, SLEEP_SAFE_MG[substance], hl);
    if (clearTime && (!latest || clearTime > latest)) {
      latest = clearTime;
    }
  }

  if (!latest) {
    return { readyAt: null, message: "All stimulants are at or below sleep-safe levels." };
  }
  return {
    readyAt: latest.toISOString(),
    message: `Estimated sleep readiness by ${formatTime(latest)}.`,
  };
}

function isWithinSleepToFiveWindow(candidate: Date, sleepByDate: Date): boolean {
  const sleepStart = new Date(sleepByDate);
  const fiveAm = new Date(sleepStart);
  fiveAm.setHours(5, 0, 0, 0);
  if (fiveAm <= sleepStart) {
    fiveAm.setDate(fiveAm.getDate() + 1);
  }
  return candidate >= sleepStart && candidate < fiveAm;
}

/**
 * Suggestion for when to take a dose so it peaks at a target time (e.g. start of next event).
 */
export interface DoseForPeakSuggestion {
  substance: SubstanceType;
  label: string;
  peakAt: string; // ISO
  takeBy: string; // ISO
  takeByFormatted: string;
  message: string;
  /** True if takeBy is after cutoff for today (suggestion still shown but user should respect cutoff). */
  afterCutoff?: boolean;
}

/**
 * Given a target "peak at" time (e.g. event start), suggest when to take each substance for peak at that time.
 * Respects mode-specific cutoff (if takeBy would be after cutoff, we still return it but set afterCutoff).
 * When profile lists an allergy for a substance, that substance is skipped.
 */
export function getDoseForPeakAt(
  peakAt: Date,
  mode: OptimizationMode,
  sleepByDate: Date,
  profile?: HealthProfile | null
): DoseForPeakSuggestion[] {
  const results: DoseForPeakSuggestion[] = [];
  const substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"];

  for (const substance of substances) {
    if (profile && isSubstanceAllergic(profile, substance)) continue;
    const config = SUBSTANCE_CONFIG[substance];
    const params = config[mode];
    const takeBy = new Date(peakAt);
    takeBy.setHours(takeBy.getHours() - config.peakHours, takeBy.getMinutes(), 0, 0);

    const cutoff = new Date(sleepByDate);
    cutoff.setHours(
      cutoff.getHours() - params.cutoffHoursBeforeSleep,
      cutoff.getMinutes(),
      0,
      0
    );
    const afterCutoff = takeBy >= cutoff;

    results.push({
      substance,
      label: config.label,
      peakAt: peakAt.toISOString(),
      takeBy: takeBy.toISOString(),
      takeByFormatted: formatTime(takeBy),
      message: `For peak by ${formatTime(peakAt)}: take ${config.label.toLowerCase()} by ${formatTime(takeBy)}${afterCutoff ? " (after your cutoff — consider skipping or earlier event)" : ""}`,
      afterCutoff,
    });
  }
  return results;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
