/**
 * Drug interaction engine.
 * Checks substance-substance and medication-substance interactions,
 * returns warnings and automatic half-life / dose-limit adjustments.
 *
 * For awareness only; not medical advice.
 */

import type { SubstanceType } from "./stimulant-calculator";
import type { HealthProfile } from "./health-profile";

export type InteractionSeverity = "info" | "caution" | "warning" | "danger";

export interface InteractionAdjustment {
  substance: SubstanceType;
  halfLifeMultiplier?: number;
  maxMgMultiplier?: number;
}

export interface Interaction {
  id: string;
  substances: string[];
  severity: InteractionSeverity;
  title: string;
  description: string;
  adjustment?: InteractionAdjustment;
}

// ---------------------------------------------------------------------------
// Substance-substance interaction database
// ---------------------------------------------------------------------------

const SUBSTANCE_INTERACTIONS: Interaction[] = [
  {
    id: "caffeine-amphetamine",
    substances: ["CAFFEINE", "ADDERALL"],
    severity: "warning",
    title: "Caffeine + Adderall",
    description:
      "Additive cardiovascular stimulation. Increased heart rate, blood pressure, and anxiety risk. Consider reducing caffeine by 50% on days you take Adderall.",
    adjustment: { substance: "CAFFEINE", maxMgMultiplier: 0.5 },
  },
  {
    id: "caffeine-dexedrine",
    substances: ["CAFFEINE", "DEXEDRINE"],
    severity: "warning",
    title: "Caffeine + Dexedrine",
    description:
      "Additive cardiovascular stimulation similar to Adderall. Consider reducing caffeine by 50% on days you take Dexedrine.",
    adjustment: { substance: "CAFFEINE", maxMgMultiplier: 0.5 },
  },
  {
    id: "caffeine-nicotine",
    substances: ["CAFFEINE", "NICOTINE"],
    severity: "caution",
    title: "Caffeine + Nicotine",
    description:
      "Nicotine induces CYP1A2, increasing caffeine clearance by ~30%. You may metabolize caffeine faster but should not increase total daily intake.",
    adjustment: { substance: "CAFFEINE", halfLifeMultiplier: 0.7 },
  },
  {
    id: "amphetamine-nicotine",
    substances: ["ADDERALL", "NICOTINE"],
    severity: "caution",
    title: "Adderall + Nicotine",
    description:
      "Both are sympathomimetics with additive cardiovascular load. Monitor heart rate and blood pressure.",
  },
  {
    id: "dexedrine-nicotine",
    substances: ["DEXEDRINE", "NICOTINE"],
    severity: "caution",
    title: "Dexedrine + Nicotine",
    description:
      "Both are sympathomimetics with additive cardiovascular load. Monitor heart rate and blood pressure.",
  },
];

// ---------------------------------------------------------------------------
// Medication-substance interaction database
// ---------------------------------------------------------------------------

interface MedPattern {
  pattern: RegExp;
  label: string;
}

interface MedInteraction {
  id: string;
  medPatterns: MedPattern[];
  affectsSubstances: SubstanceType[];
  severity: InteractionSeverity;
  title: string;
  description: string;
  adjustment?: InteractionAdjustment;
}

const MEDICATION_INTERACTIONS: MedInteraction[] = [
  {
    id: "ssri-amphetamine",
    medPatterns: [
      { pattern: /\b(fluoxetine|sertraline|paroxetine|citalopram|escitalopram|fluvoxamine|ssri)\b/i, label: "SSRI" },
    ],
    affectsSubstances: ["ADDERALL", "DEXEDRINE"],
    severity: "danger",
    title: "SSRI + Amphetamine",
    description:
      "Risk of serotonin syndrome. If you take an SSRI alongside amphetamines, discuss closely with your prescribing physician.",
  },
  {
    id: "fluvoxamine-caffeine",
    medPatterns: [
      { pattern: /\bfluvoxamine\b/i, label: "Fluvoxamine" },
    ],
    affectsSubstances: ["CAFFEINE"],
    severity: "warning",
    title: "Fluvoxamine + Caffeine",
    description:
      "Fluvoxamine inhibits CYP1A2, increasing caffeine half-life 3–5×. You will clear caffeine much more slowly. Drastically reduce intake.",
    adjustment: { substance: "CAFFEINE", halfLifeMultiplier: 3.0, maxMgMultiplier: 0.3 },
  },
  {
    id: "maoi-stimulants",
    medPatterns: [
      { pattern: /\b(maoi|monoamine oxidase inhibitor|phenelzine|tranylcypromine|isocarboxazid|selegiline)\b/i, label: "MAOI" },
    ],
    affectsSubstances: ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"],
    severity: "danger",
    title: "MAOI + Stimulants",
    description:
      "MAOIs combined with stimulants can cause hypertensive crisis. This is a dangerous interaction — consult your doctor before using any stimulant.",
  },
  {
    id: "beta-blocker-stimulants",
    medPatterns: [
      { pattern: /\b(beta.?blocker|propranolol|atenolol|metoprolol|carvedilol|bisoprolol)\b/i, label: "Beta-blocker" },
    ],
    affectsSubstances: ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"],
    severity: "info",
    title: "Beta-Blocker + Stimulants",
    description:
      "Beta-blockers and stimulants have opposing cardiovascular effects. The stimulant may partially counteract your beta-blocker. Discuss with your doctor.",
  },
  {
    id: "oral-contraceptive-caffeine",
    medPatterns: [
      { pattern: /\b(contraceptive|birth\s*control|oral\s*contraceptive|oc\b)/i, label: "Oral contraceptive" },
    ],
    affectsSubstances: ["CAFFEINE"],
    severity: "caution",
    title: "Oral Contraceptives + Caffeine",
    description:
      "Oral contraceptives roughly double caffeine half-life (~10h). You may feel effects much longer than expected.",
    adjustment: { substance: "CAFFEINE", halfLifeMultiplier: 2.0 },
  },
  {
    id: "antacid-amphetamine",
    medPatterns: [
      { pattern: /\b(antacid|ppi|omeprazole|pantoprazole|esomeprazole|lansoprazole|tums|calcium carbonate)\b/i, label: "Antacid / PPI" },
    ],
    affectsSubstances: ["ADDERALL", "DEXEDRINE"],
    severity: "info",
    title: "Antacids / PPIs + Amphetamines",
    description:
      "Alkaline stomach environment can increase amphetamine absorption. Effects may be stronger or last longer than expected.",
  },
];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface ActiveInteraction extends Interaction {
  source: "substance" | "medication";
}

/**
 * Determine all active interactions given the user's enabled substances,
 * medications string, and today's logged substances.
 */
export function getActiveInteractions(
  enabledSubstances: SubstanceType[],
  profile: HealthProfile | null | undefined,
  todayLoggedSubstances?: SubstanceType[],
): ActiveInteraction[] {
  const active: ActiveInteraction[] = [];
  const relevantSubstances = new Set([
    ...enabledSubstances,
    ...(todayLoggedSubstances ?? []),
  ]);

  for (const ix of SUBSTANCE_INTERACTIONS) {
    const allPresent = ix.substances.every((s) => relevantSubstances.has(s as SubstanceType));
    if (allPresent) {
      active.push({ ...ix, source: "substance" });
    }
  }

  const meds = (profile?.medications ?? "").toLowerCase();
  if (meds.length > 0) {
    for (const mix of MEDICATION_INTERACTIONS) {
      const medMatch = mix.medPatterns.some((p) => p.pattern.test(meds));
      if (!medMatch) continue;
      const substanceMatch = mix.affectsSubstances.some((s) => relevantSubstances.has(s));
      if (substanceMatch) {
        active.push({
          id: mix.id,
          substances: [...mix.medPatterns.map((p) => p.label), ...mix.affectsSubstances],
          severity: mix.severity,
          title: mix.title,
          description: mix.description,
          adjustment: mix.adjustment,
          source: "medication",
        });
      }
    }
  }

  return active;
}

/**
 * Collect all half-life and max-mg multipliers from active interactions
 * for a specific substance. Returns the product of all multipliers.
 */
export function getInteractionAdjustments(
  interactions: ActiveInteraction[],
  substance: SubstanceType,
): { halfLifeMultiplier: number; maxMgMultiplier: number } {
  let hlMul = 1;
  let mgMul = 1;

  for (const ix of interactions) {
    if (!ix.adjustment || ix.adjustment.substance !== substance) continue;
    if (ix.adjustment.halfLifeMultiplier != null) hlMul *= ix.adjustment.halfLifeMultiplier;
    if (ix.adjustment.maxMgMultiplier != null) mgMul *= ix.adjustment.maxMgMultiplier;
  }

  return { halfLifeMultiplier: hlMul, maxMgMultiplier: mgMul };
}

export { SUBSTANCE_INTERACTIONS, MEDICATION_INTERACTIONS };
