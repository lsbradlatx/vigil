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
  sex?: string | null;
  smokingStatus?: string | null;
  birthYear?: number | null;
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
 * Personalized half-life based on profile factors.
 *
 * Caffeine (base 5h):
 *  - Smoker: ×0.6 (~3h) -- CYP1A2 induction (Nehlig 2018)
 *  - Female + meds containing "contraceptive"/"birth control": ×2.0 (~10h)
 *  - Fluvoxamine or CYP1A2 inhibitors in meds: ×3.0
 *  - Age ≥65: ×1.3
 *
 * Amphetamine (base 11h): no major adjustments modeled.
 * Nicotine (base 2h): smoker clearance already inherent; no adjustment.
 */
export function getPersonalizedHalfLife(
  substance: SubstanceType,
  profile: HealthProfile | null | undefined,
): number {
  const BASE: Record<SubstanceType, number> = {
    CAFFEINE: 5,
    ADDERALL: 11,
    DEXEDRINE: 11,
    NICOTINE: 2,
  };

  let hl = BASE[substance];
  if (!profile) return hl;

  if (substance === "CAFFEINE") {
    if (profile.smokingStatus === "smoker") {
      hl *= 0.6;
    }

    const meds = (profile.medications ?? "").toLowerCase();

    if (/\b(fluvoxamine|cyp1a2\s*inhibitor)\b/.test(meds)) {
      hl *= 3.0;
    } else if (
      profile.sex === "female" &&
      /\b(contraceptive|birth\s*control|oral\s*contraceptive)\b/.test(meds)
    ) {
      hl *= 2.0;
    }

    if (profile.birthYear != null) {
      const age = new Date().getFullYear() - profile.birthYear;
      if (age >= 65) {
        hl *= 1.3;
      }
    }
  }

  return Math.round(hl * 10) / 10;
}

/**
 * Return personalized half-lives for all substances.
 */
export function getAllPersonalizedHalfLives(
  profile: HealthProfile | null | undefined,
): Record<SubstanceType, number> {
  const substances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"];
  const result = {} as Record<SubstanceType, number>;
  for (const s of substances) {
    result[s] = getPersonalizedHalfLife(s, profile);
  }
  return result;
}
