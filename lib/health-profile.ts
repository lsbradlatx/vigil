/**
 * Health profile helpers for personalized stimulant recommendations.
 * For awareness only; not medical advice.
 */

import type { SubstanceType } from "./stimulant-calculator";

export interface HealthProfile {
  weightKg?: number | null;
  heightCm?: number | null;
  allergies?: string | null;
  medications?: string | null;
}

/** Keywords that map to substances for allergy matching (case-insensitive). */
const ALLERGY_KEYWORDS: Record<SubstanceType, string[]> = {
  CAFFEINE: ["caffeine", "coffee"],
  ADDERALL: ["adderall", "amphetamine", "amphetamines", "mixed amphetamine"],
  DEXEDRINE: ["dexedrine", "dextroamphetamine"],
  NICOTINE: ["nicotine", "tobacco"],
};

/** Parse allergies string (comma-separated) into lowercased tokens. */
export function parseAllergyTokens(allergies: string | null | undefined): string[] {
  if (!allergies || typeof allergies !== "string") return [];
  return allergies
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Return true if the profile lists an allergy that matches this substance. */
export function isSubstanceAllergic(
  profile: HealthProfile | null | undefined,
  substance: SubstanceType
): boolean {
  const tokens = parseAllergyTokens(profile?.allergies ?? null);
  if (tokens.length === 0) return false;
  const keywords = ALLERGY_KEYWORDS[substance];
  return keywords.some((kw) => tokens.some((t) => t.includes(kw) || kw.includes(t)));
}

/** FDA-style 400 mg or ~5.5 mg/kg for adults, whichever is lower. Returns null if no weight. */
export function getWeightBasedCaffeineMaxMg(profile: HealthProfile | null | undefined): number | null {
  const weightKg = profile?.weightKg;
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  const perKg = 5.5;
  const cap = Math.round(weightKg * perKg);
  return Math.min(400, Math.max(0, cap));
}

/**
 * Placeholder for future third-party health API (e.g. Human API, Apple Health).
 * Would fetch height, weight, conditions, allergies and map to HealthProfile.
 */
// export async function fetchFromExternalHealthProvider(accessToken: string): Promise<Partial<HealthProfile> | null> {
//   return null;
// }
