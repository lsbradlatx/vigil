/**
 * Time-based suggestions for stimulant use. For awareness only; not medical advice.
 * Uses typical half-life and duration to suggest next-dose windows and cutoff times for sleep.
 */

export type SubstanceType = "CAFFEINE" | "ADDERALL" | "NICOTINE";

export interface SubstanceConfig {
  halfLifeHours: number;
  peakHours: number;
  /** Hours before sleep to suggest cutoff (e.g. no caffeine after this time) */
  cutoffHoursBeforeSleep: number;
  /** Suggested spacing between doses (hours) */
  minSpacingHours?: number;
  label: string;
}

export const SUBSTANCE_CONFIG: Record<SubstanceType, SubstanceConfig> = {
  CAFFEINE: {
    halfLifeHours: 5,
    peakHours: 1,
    cutoffHoursBeforeSleep: 7,
    minSpacingHours: 4,
    label: "Caffeine",
  },
  ADDERALL: {
    halfLifeHours: 11,
    peakHours: 2,
    cutoffHoursBeforeSleep: 12,
    minSpacingHours: undefined, // typically once daily
    label: "Adderall",
  },
  NICOTINE: {
    halfLifeHours: 2,
    peakHours: 0.25,
    cutoffHoursBeforeSleep: 3,
    minSpacingHours: 2,
    label: "Nicotine",
  },
};

export interface CutoffResult {
  substance: SubstanceType;
  label: string;
  /** ISO time string e.g. "15:00" for 3 PM */
  cutoffTime: string;
  message: string;
}

export interface NextDoseWindow {
  substance: SubstanceType;
  label: string;
  /** Suggested window start (ISO datetime) */
  windowStart: string;
  /** Suggested window end (ISO datetime) */
  windowEnd: string;
  message: string;
}

/**
 * Given a "sleep by" time (e.g. 22:00), returns cutoff times per substance.
 */
export function getCutoffTimes(
  sleepByDate: Date,
  substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "NICOTINE"]
): CutoffResult[] {
  const results: CutoffResult[] = [];
  for (const substance of substances) {
    const config = SUBSTANCE_CONFIG[substance];
    const cutoff = new Date(sleepByDate);
    cutoff.setHours(
      cutoff.getHours() - config.cutoffHoursBeforeSleep,
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
    });
  }
  return results;
}

/**
 * Given last dose time and optional "now", suggests next dose window based on half-life spacing.
 */
export function getNextDoseWindows(
  lastDoseBySubstance: Partial<Record<SubstanceType, Date>>,
  now: Date,
  focusWindowEnd?: Date
): NextDoseWindow[] {
  const results: NextDoseWindow[] = [];
  const substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "NICOTINE"];

  for (const substance of substances) {
    const config = SUBSTANCE_CONFIG[substance];
    const lastDose = lastDoseBySubstance[substance];

    let windowStart: Date;
    let windowEnd: Date;

    if (!lastDose) {
      // No recent dose — suggest "any time" today, e.g. next 2 hours as a window
      windowStart = new Date(now);
      windowEnd = new Date(now);
      windowEnd.setHours(windowEnd.getHours() + 2);
      results.push({
        substance,
        label: config.label,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        message: `No recent ${config.label.toLowerCase()} logged. You can take some now; peak in ~${config.peakHours}h.`,
      });
      continue;
    }

    const elapsedHours = (now.getTime() - lastDose.getTime()) / (60 * 60 * 1000);
    const minSpacing = config.minSpacingHours ?? config.halfLifeHours;

    if (elapsedHours < minSpacing) {
      // Too soon — suggest after minSpacing from last dose
      windowStart = new Date(lastDose);
      windowStart.setHours(windowStart.getHours() + minSpacing);
      windowEnd = new Date(windowStart);
      windowEnd.setHours(windowEnd.getHours() + 1);
      if (windowEnd < now) {
        windowStart = new Date(now);
        windowEnd = new Date(now);
        windowEnd.setHours(windowEnd.getHours() + 1);
      }
      results.push({
        substance,
        label: config.label,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        message: `Next ${config.label.toLowerCase()} suggested after ${formatTime(windowStart)} (${minSpacing}h after last dose).`,
      });
    } else {
      // OK to take another — suggest a window from now
      windowStart = new Date(now);
      windowEnd = new Date(now);
      windowEnd.setHours(windowEnd.getHours() + 1);
      results.push({
        substance,
        label: config.label,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        message: `OK to take ${config.label.toLowerCase()} now; peak in ~${config.peakHours}h.`,
      });
    }
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
