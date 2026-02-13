/**
 * Time-based suggestions for stimulant use. For awareness only; not medical advice.
 * Two modes: health (stricter) and productivity (more permissive), both within recommended limits.
 */

export type SubstanceType = "CAFFEINE" | "ADDERALL" | "NICOTINE";

export type OptimizationMode = "health" | "productivity";

/** Absolute recommended limits (never exceeded in either mode). */
export interface SubstanceLimits {
  /** Max doses per 24h (common guidelines). */
  maxDosesPerDay: number;
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
      minSpacingHours: 3,
      minCutoffHoursBeforeSleep: 6,
      label: "Caffeine",
    },
    health: {
      cutoffHoursBeforeSleep: 8,
      spacingHours: 5,
      maxDosesPerDay: 2,
    },
    productivity: {
      cutoffHoursBeforeSleep: 6,
      spacingHours: 4,
      maxDosesPerDay: 4,
    },
  },
  ADDERALL: {
    halfLifeHours: 11,
    peakHours: 2,
    label: "Adderall",
    limits: {
      maxDosesPerDay: 2,
      minSpacingHours: 8,
      minCutoffHoursBeforeSleep: 10,
      label: "Adderall",
    },
    health: {
      cutoffHoursBeforeSleep: 14,
      spacingHours: 12,
      maxDosesPerDay: 1,
    },
    productivity: {
      cutoffHoursBeforeSleep: 10,
      spacingHours: 8,
      maxDosesPerDay: 2,
    },
  },
  NICOTINE: {
    halfLifeHours: 2,
    peakHours: 0.25,
    label: "Nicotine",
    limits: {
      maxDosesPerDay: 8,
      minSpacingHours: 2,
      minCutoffHoursBeforeSleep: 3,
      label: "Nicotine",
    },
    health: {
      cutoffHoursBeforeSleep: 4,
      spacingHours: 3,
      maxDosesPerDay: 5,
    },
    productivity: {
      cutoffHoursBeforeSleep: 3,
      spacingHours: 2,
      maxDosesPerDay: 8,
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
}

/**
 * Given a "sleep by" time and mode, returns cutoff times per substance (within recommended limits).
 */
export function getCutoffTimes(
  sleepByDate: Date,
  mode: OptimizationMode,
  substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "NICOTINE"]
): CutoffResult[] {
  const results: CutoffResult[] = [];
  for (const substance of substances) {
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
 * Given last dose time, mode, and today's dose count, suggests next dose window (never above recommended limits).
 */
export function getNextDoseWindows(
  lastDoseBySubstance: Partial<Record<SubstanceType, Date>>,
  now: Date,
  mode: OptimizationMode,
  dosesTodayBySubstance: Record<SubstanceType, number>
): NextDoseWindow[] {
  const results: NextDoseWindow[] = [];
  const substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "NICOTINE"];

  for (const substance of substances) {
    const config = SUBSTANCE_CONFIG[substance];
    const params = config[mode];
    const lastDose = lastDoseBySubstance[substance];
    const dosesToday = dosesTodayBySubstance[substance] ?? 0;
    const atLimit = dosesToday >= params.maxDosesPerDay;

    if (atLimit) {
      results.push({
        substance,
        label: config.label,
        windowStart: now.toISOString(),
        windowEnd: now.toISOString(),
        message: `At recommended limit (${params.maxDosesPerDay} ${params.maxDosesPerDay === 1 ? "dose" : "doses"}/day). Wait until tomorrow.`,
        atLimit: true,
      });
      continue;
    }

    let windowStart: Date;
    let windowEnd: Date;
    let message: string;

    if (!lastDose) {
      windowStart = new Date(now);
      windowEnd = new Date(now);
      windowEnd.setHours(windowEnd.getHours() + 1);
      message = `No recent ${config.label.toLowerCase()} logged. You can take some now; peak in ~${config.peakHours}h. (Max ${params.maxDosesPerDay}/day in ${mode} mode.)`;
      results.push({
        substance,
        label: config.label,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        message,
      });
      continue;
    }

    const elapsedHours = (now.getTime() - lastDose.getTime()) / (60 * 60 * 1000);
    const minSpacing = params.spacingHours;

    if (elapsedHours < minSpacing) {
      windowStart = new Date(lastDose);
      windowStart.setHours(windowStart.getHours() + minSpacing);
      windowEnd = new Date(windowStart);
      windowEnd.setHours(windowEnd.getHours() + 1);
      if (windowEnd < now) {
        windowStart = new Date(now);
        windowEnd = new Date(now);
        windowEnd.setHours(windowEnd.getHours() + 1);
      }
      message = `Next ${config.label.toLowerCase()} suggested after ${formatTime(windowStart)} (${minSpacing}h after last dose).`;
    } else {
      windowStart = new Date(now);
      windowEnd = new Date(now);
      windowEnd.setHours(windowEnd.getHours() + 1);
      message = `OK to take ${config.label.toLowerCase()} now; peak in ~${config.peakHours}h. (${dosesToday + 1}/${params.maxDosesPerDay} today.)`;
    }

    results.push({
      substance,
      label: config.label,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      message,
    });
  }
  return results;
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
 */
export function getDoseForPeakAt(
  peakAt: Date,
  mode: OptimizationMode,
  sleepByDate: Date
): DoseForPeakSuggestion[] {
  const results: DoseForPeakSuggestion[] = [];
  const substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "NICOTINE"];

  for (const substance of substances) {
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
