"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { getCachedRouteData, setCachedRouteData } from "@/lib/route-prefetch";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ConcentrationTimeline } from "@/components/ConcentrationTimeline";

type Substance = "CAFFEINE" | "ADDERALL" | "DEXEDRINE" | "NICOTINE";

type StimulantLog = {
  id: string;
  substance: Substance;
  amount: string | null;
  amountMg: number | null;
  loggedAt: string;
  notes: string | null;
};

type CutoffResult = {
  substance: Substance;
  label: string;
  cutoffTime: string;
  message: string;
  maxDosesPerDay: number;
};

type NextDoseWindow = {
  substance: Substance;
  label: string;
  windowStart: string;
  windowEnd: string;
  message: string;
  atLimit?: boolean;
  totalMgToday?: number;
  maxMgPerDay?: number;
  remainingMgToday?: number;
  dosesToday?: number;
  currentMgActive?: number;
  halfLifeUsed?: number;
  adjustedMaxMg?: number;
};

type OptimizationMode = "health" | "productivity";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
};

type DoseForPeak = {
  substance: string;
  label: string;
  takeByFormatted: string;
  message: string;
  afterCutoff?: boolean;
};

type GovernmentLimits = Record<string, { maxDosesPerDay: number; maxMgPerDay: number }>;

type InteractionAlert = {
  id: string;
  severity: "info" | "caution" | "warning" | "danger";
  title: string;
  description: string;
  source: string;
};

type ToleranceInfo = {
  substance: Substance;
  level: string;
  multiplier: number;
  avgDailyMg: number;
  daysUsed: number;
  totalDays: number;
  message: string | null;
};

type CurvePoint = { time: number; mgActive: number };

type HealthProfileData = {
  weightKg?: number | null;
  heightCm?: number | null;
  allergies?: string | null;
  medications?: string | null;
  sex?: string | null;
  smokingStatus?: string | null;
  birthYear?: number | null;
};

type OptimizerResponse = {
  now: string;
  sleepBy: string;
  mode: OptimizationMode;
  cutoffs: CutoffResult[];
  governmentLimits?: GovernmentLimits;
  nextDoseWindows: NextDoseWindow[];
  healthProfile?: HealthProfileData;
  personalizedHalfLives?: Record<Substance, number>;
  interactions?: InteractionAlert[];
  tolerance?: Record<Substance, ToleranceInfo>;
  sleepReadiness?: { readyAt: string | null; message: string };
  concentrationCurves?: Record<string, CurvePoint[]>;
  chartStart?: number;
  chartEnd?: number;
  eventsToday?: CalendarEvent[];
  nextEventToday?: { id: string; title: string; start: string; end: string } | null;
  doseForPeakAtNextEvent?: DoseForPeak[];
};

type DailyTotal = { date: string; totalMg: number; doses: number };
type SubstanceAnalytics = {
  avg7d: number;
  avg30d: number;
  doses7d: number;
  doses30d: number;
  trend: "increasing" | "stable" | "decreasing";
  dailyTotals14d: DailyTotal[];
};
type AnalyticsResponse = {
  analytics: Partial<Record<Substance, SubstanceAnalytics>>;
  cleanestStreak: number;
  totalLogs30d: number;
};

type DrinkSize = { id: string; sizeLabel: string; caffeineMg: number };
type Drink = { id: string; name: string; brand: string | null; sizes: DrinkSize[] };

const SUBSTANCE_OPTIONS: { value: Substance; label: string }[] = [
  { value: "CAFFEINE", label: "Caffeine" },
  { value: "ADDERALL", label: "Adderall" },
  { value: "DEXEDRINE", label: "Dexedrine" },
  { value: "NICOTINE", label: "Nicotine" },
];

const LB_PER_KG = 2.205;
const CM_PER_IN = 2.54;
const IN_PER_FT = 12;

function kgToLb(kg: number): number { return Math.round(kg * LB_PER_KG * 10) / 10; }
function lbToKg(lb: number): number { return Math.round((lb / LB_PER_KG) * 100) / 100; }
function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = cm / CM_PER_IN;
  return { ft: Math.floor(totalIn / IN_PER_FT), in: Math.round(totalIn % IN_PER_FT) };
}
function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * IN_PER_FT + inch) * CM_PER_IN);
}

const SEVERITY_STYLES: Record<string, string> = {
  danger: "border-red-400 bg-red-50 text-red-900",
  warning: "border-amber-400 bg-amber-50 text-amber-900",
  caution: "border-yellow-300 bg-yellow-50 text-yellow-900",
  info: "border-sky-300 bg-sky-50 text-sky-900",
};

const TREND_ICONS: Record<string, string> = {
  increasing: "\u2191",
  decreasing: "\u2193",
  stable: "\u2194",
};

export default function StimulantPage() {
  const [logs, setLogs] = useState<StimulantLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [optimizer, setOptimizer] = useState<OptimizerResponse | null>(null);
  const [loadingOptimizer, setLoadingOptimizer] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formSubstance, setFormSubstance] = useState<Substance>("CAFFEINE");
  const [formAmountMg, setFormAmountMg] = useState<string>("");
  const [formLogByDrink, setFormLogByDrink] = useState(true);
  const [formDrinkId, setFormDrinkId] = useState("");
  const [formDrinkSizeId, setFormDrinkSizeId] = useState("");
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [formLoggedAt, setFormLoggedAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [sleepBy, setSleepBy] = useState("22:00");
  const [mode, setMode] = useState<OptimizationMode>("health");
  const [enabledSubstances, setEnabledSubstances] = useState<Substance[]>(["CAFFEINE"]);

  const [healthProfile, setHealthProfile] = useState<HealthProfileData | null>(null);
  const [profileUnits, setProfileUnits] = useState<"imperial" | "metric">(() => {
    if (typeof window === "undefined") return "imperial";
    return localStorage.getItem("vigil_profileUnits") === "metric" ? "metric" : "imperial";
  });
  const [profileWeight, setProfileWeight] = useState("");
  const [profileHeight, setProfileHeight] = useState("");
  const [profileHeightFt, setProfileHeightFt] = useState("");
  const [profileHeightIn, setProfileHeightIn] = useState("");
  const [profileAllergies, setProfileAllergies] = useState("");
  const [profileMedications, setProfileMedications] = useState("");
  const [profileSex, setProfileSex] = useState("");
  const [profileSmokingStatus, setProfileSmokingStatus] = useState("");
  const [profileBirthYear, setProfileBirthYear] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileCollapsed, setProfileCollapsed] = useState(true);

  useEffect(() => {
    const savedSleep = localStorage.getItem("vigil_sleepBy");
    const savedMode = localStorage.getItem("vigil_mode");
    const savedUnits = localStorage.getItem("vigil_profileUnits");
    const savedSubstances = localStorage.getItem("vigil_enabledSubstances");
    if (savedSleep) setSleepBy(savedSleep);
    if (savedMode === "health" || savedMode === "productivity") setMode(savedMode as OptimizationMode);
    if (savedUnits === "imperial" || savedUnits === "metric") setProfileUnits(savedUnits);
    if (savedSubstances) {
      try {
        const parsed = JSON.parse(savedSubstances) as Substance[];
        const valid = parsed.filter((s) => SUBSTANCE_OPTIONS.some((opt) => opt.value === s));
        if (valid.length > 0) setEnabledSubstances(valid);
      } catch { /* keep default */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("vigil_enabledSubstances", JSON.stringify(enabledSubstances));
    if (!enabledSubstances.includes(formSubstance)) {
      const next = enabledSubstances[0] ?? "CAFFEINE";
      setFormSubstance(next);
      if (next !== "CAFFEINE") { setFormDrinkId(""); setFormDrinkSizeId(""); }
    }
  }, [enabledSubstances, formSubstance]);

  const handleSleepByChange = (value: string) => { setSleepBy(value); localStorage.setItem("vigil_sleepBy", value); };
  const handleModeChange = (value: OptimizationMode) => { setMode(value); localStorage.setItem("vigil_mode", value); };

  const applyHealthProfileData = useCallback((data: HealthProfileData | null, units: "imperial" | "metric") => {
    if (!data) { setHealthProfile(null); return; }
    setHealthProfile(data);
    setProfileAllergies(data.allergies ?? "");
    setProfileMedications(data.medications ?? "");
    setProfileSex(data.sex ?? "");
    setProfileSmokingStatus(data.smokingStatus ?? "");
    setProfileBirthYear(data.birthYear != null ? String(data.birthYear) : "");
    const kg = data.weightKg;
    const cm = data.heightCm;
    if (units === "imperial") {
      setProfileWeight(kg != null && Number.isFinite(kg) ? String(kgToLb(kg)) : "");
      if (cm != null && Number.isFinite(cm)) {
        const { ft, in: inch } = cmToFtIn(cm);
        setProfileHeightFt(String(ft));
        setProfileHeightIn(String(inch));
      } else { setProfileHeightFt(""); setProfileHeightIn(""); }
      setProfileHeight("");
    } else {
      setProfileWeight(kg != null && Number.isFinite(kg) ? String(kg) : "");
      setProfileHeight(cm != null && Number.isFinite(cm) ? String(cm) : "");
      setProfileHeightFt(""); setProfileHeightIn("");
    }
  }, []);

  const getWeightKgAndHeightCm = (): { weightKg: number | null; heightCm: number | null } => {
    if (profileUnits === "imperial") {
      const w = profileWeight.trim() ? parseFloat(profileWeight) : NaN;
      const ft = profileHeightFt.trim() ? parseFloat(profileHeightFt) : NaN;
      const inch = profileHeightIn.trim() ? parseFloat(profileHeightIn) : NaN;
      return {
        weightKg: Number.isFinite(w) ? lbToKg(w) : null,
        heightCm: Number.isFinite(ft) || Number.isFinite(inch) ? ftInToCm(Number.isFinite(ft) ? ft : 0, Number.isFinite(inch) ? inch : 0) : null,
      };
    }
    const w = profileWeight.trim() ? parseFloat(profileWeight) : NaN;
    const h = profileHeight.trim() ? parseFloat(profileHeight) : NaN;
    return { weightKg: Number.isFinite(w) ? w : null, heightCm: Number.isFinite(h) ? h : null };
  };

  const handleProfileUnitsChange = (units: "imperial" | "metric") => {
    if (units === profileUnits) return;
    if (units === "metric") {
      const w = profileWeight.trim() ? parseFloat(profileWeight) : NaN;
      const ft = profileHeightFt.trim() ? parseFloat(profileHeightFt) : NaN;
      const inch = profileHeightIn.trim() ? parseFloat(profileHeightIn) : NaN;
      if (Number.isFinite(w)) setProfileWeight(String(lbToKg(w).toFixed(1))); else setProfileWeight("");
      if (Number.isFinite(ft) || Number.isFinite(inch)) setProfileHeight(String(ftInToCm(ft || 0, inch || 0))); else setProfileHeight("");
      setProfileHeightFt(""); setProfileHeightIn("");
    } else {
      const w = profileWeight.trim() ? parseFloat(profileWeight) : NaN;
      const h = profileHeight.trim() ? parseFloat(profileHeight) : NaN;
      if (Number.isFinite(w)) setProfileWeight(String(kgToLb(w))); else setProfileWeight("");
      if (Number.isFinite(h)) {
        const { ft, in: inch } = cmToFtIn(h);
        setProfileHeightFt(String(ft)); setProfileHeightIn(String(inch));
      } else { setProfileHeightFt(""); setProfileHeightIn(""); }
      setProfileHeight("");
    }
    setProfileUnits(units);
    localStorage.setItem("vigil_profileUnits", units);
  };

  const saveHealthProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const { weightKg, heightCm } = getWeightKgAndHeightCm();
      const res = await fetch("/api/health-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: weightKg ?? null,
          heightCm: heightCm ?? null,
          allergies: profileAllergies.trim() || null,
          medications: profileMedications.trim() || null,
          sex: profileSex || null,
          smokingStatus: profileSmokingStatus || null,
          birthYear: profileBirthYear.trim() ? parseInt(profileBirthYear) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setHealthProfile(data);
      fetchOptimizer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const getLogsUrl = useCallback(() => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return `/api/stimulant?start=${twoDaysAgo.toISOString()}&limit=200`;
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(getLogsUrl());
      if (!res.ok) throw new Error("Failed to load logs");
      setLogs(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoadingLogs(false); }
  }, [getLogsUrl]);

  const hasOptimizerData = useRef(false);
  const fetchOptimizer = useCallback(async () => {
    if (!hasOptimizerData.current) setLoadingOptimizer(true);
    try {
      setError(null);
      const _now = new Date();
      const _ds = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());
      const _de = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate(), 23, 59, 59, 999);
      const params = new URLSearchParams({
        sleepBy, mode,
        dayStart: _ds.toISOString(), dayEnd: _de.toISOString(),
        enabled: enabledSubstances.join(","),
      });
      const res = await fetch(`/api/stimulant/optimizer?${params}`);
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data = await res.json();
      setOptimizer(data);
      hasOptimizerData.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoadingOptimizer(false); }
  }, [sleepBy, mode, enabledSubstances]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/stimulant/analytics");
      if (res.ok) setAnalyticsData(await res.json());
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    const cached = getCachedRouteData("/stimulant") as { healthProfile: HealthProfileData | null; logs: StimulantLog[]; optimizer: OptimizerResponse | null } | null;
    const hadCache = cached && Array.isArray(cached.logs) && cached.optimizer != null;
    if (hadCache && cached) {
      if (cached.healthProfile) applyHealthProfileData(cached.healthProfile, profileUnits);
      else setHealthProfile(null);
      setLogs(cached.logs);
      setOptimizer(cached.optimizer);
      hasOptimizerData.current = true;
      setLoadingLogs(false);
      setLoadingOptimizer(false);
    } else {
      setLoadingLogs(true);
      if (!hasOptimizerData.current) setLoadingOptimizer(true);
    }
    const _now = new Date();
    const _ds = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());
    const _de = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate(), 23, 59, 59, 999);
    const optimizerParams = new URLSearchParams({
      sleepBy, mode,
      dayStart: _ds.toISOString(), dayEnd: _de.toISOString(),
      enabled: enabledSubstances.join(","),
    });
    const optimizerUrl = `/api/stimulant/optimizer?${optimizerParams}`;
    Promise.all([
      fetch("/api/health-profile")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: HealthProfileData | null) => { if (data) applyHealthProfileData(data, profileUnits); else setHealthProfile(null); return data; })
        .catch(() => { setHealthProfile(null); return null; }),
      fetch(getLogsUrl())
        .then((res) => { if (!res.ok) throw new Error("Failed"); return res.json(); })
        .then((data: StimulantLog[]) => { setLogs(data); return data; })
        .catch(() => { setLoadingLogs(false); return []; }),
      fetch(optimizerUrl)
        .then((res) => { if (!res.ok) throw new Error("Failed"); return res.json(); })
        .then((data: OptimizerResponse) => { setOptimizer(data); hasOptimizerData.current = true; return data; })
        .catch(() => { setLoadingOptimizer(false); return null; }),
    ]).then(([hp, lg, opt]) => {
      if (opt != null && Array.isArray(lg)) setCachedRouteData("/stimulant", { healthProfile: hp ?? null, logs: lg, optimizer: opt });
    }).finally(() => { setLoadingLogs(false); setLoadingOptimizer(false); });
    fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepBy, mode, profileUnits, enabledSubstances]);

  useEffect(() => {
    if (formSubstance === "CAFFEINE" && formLogByDrink && drinks.length === 0) {
      fetch("/api/drinks").then((res) => (res.ok ? res.json() : [])).then(setDrinks).catch(() => setDrinks([]));
    }
  }, [formSubstance, formLogByDrink, drinks.length]);

  const selectedDrink = drinks.find((d) => d.id === formDrinkId);
  const selectedSize = selectedDrink?.sizes.find((s) => s.id === formDrinkSizeId);
  const enabledSubstanceSet = new Set(enabledSubstances);
  const visibleCutoffs = optimizer?.cutoffs.filter((c) => enabledSubstanceSet.has(c.substance)) ?? [];
  const visibleNextDoseWindows = optimizer?.nextDoseWindows.filter((w) => enabledSubstanceSet.has(w.substance)) ?? [];
  const visiblePeakSuggestions = optimizer?.doseForPeakAtNextEvent?.filter((d) => enabledSubstanceSet.has(d.substance as Substance)) ?? [];

  const toggleEnabledSubstance = (substance: Substance) => {
    setEnabledSubstances((prev) => {
      if (prev.includes(substance)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== substance);
      }
      return [...prev, substance];
    });
  };

  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const useDrink = formSubstance === "CAFFEINE" && formLogByDrink && formDrinkSizeId;
    if (formSubstance === "CAFFEINE" && useDrink && !formDrinkSizeId) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        substance: formSubstance,
        loggedAt: new Date(formLoggedAt).toISOString(),
        notes: formNotes.trim() || null,
      };
      if (useDrink) body.drinkSizeId = formDrinkSizeId;
      else body.amountMg = formAmountMg.trim() ? parseFloat(formAmountMg) : null;
      const res = await fetch("/api/stimulant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to log");
      const created = await res.json();
      setLogs((prev) => [created, ...prev]);
      setFormAmountMg(""); setFormDrinkId(""); setFormDrinkSizeId(""); setFormNotes("");
      setFormLoggedAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      fetchOptimizer();
      fetchAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log");
    } finally { setSubmitting(false); }
  };

  // Prepare concentration curves for the timeline component
  const timelineCurves: Partial<Record<Substance, CurvePoint[]>> = {};
  if (optimizer?.concentrationCurves) {
    for (const s of enabledSubstances) {
      const curve = optimizer.concentrationCurves[s];
      if (curve && curve.length > 0) timelineCurves[s] = curve;
    }
  }
  const doseMarkers = logs
    .filter((l) => enabledSubstanceSet.has(l.substance))
    .map((l) => ({
      time: new Date(l.loggedAt).getTime(),
      substance: l.substance,
      mg: l.amountMg ?? 0,
    }));

  const sleepTimeMs = optimizer?.sleepBy ? new Date(optimizer.sleepBy).getTime() : undefined;

  // Active alerts: interactions + tolerance notes
  const activeAlerts = optimizer?.interactions?.filter(
    (ix) => ix.severity === "warning" || ix.severity === "danger" || ix.severity === "caution",
  ) ?? [];
  const toleranceNotes = optimizer?.tolerance
    ? (Object.values(optimizer.tolerance) as ToleranceInfo[]).filter(
        (t) => t.message && enabledSubstanceSet.has(t.substance),
      )
    : [];

  return (
    <div className="container py-[clamp(2rem,4vw,3rem)] space-y-8">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <h1 className="font-display text-[clamp(1.9rem,3.8vw,2.4rem)] font-medium text-obsidian">
          Stimulant Optimizer
        </h1>
        <p className="text-graphite text-sm max-w-xl mt-2">
          Pharmacokinetic concentration modeling for smarter timing. For awareness only; not medical advice.
        </p>
      </ScrollReveal>

      {error && (
        <div className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-linen)] text-obsidian px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* ── 1. Concentration Timeline ── */}
      <ScrollReveal animation="fade-up" delay={100}>
        <ConcentrationTimeline
          curves={timelineCurves}
          doseMarkers={doseMarkers}
          sleepTime={sleepTimeMs}
          startTime={optimizer?.chartStart}
          endTime={optimizer?.chartEnd}
          maxActiveMg={optimizer?.personalizedHalfLives ? undefined : undefined}
        />
      </ScrollReveal>

      {/* ── 2. Active Alerts ── */}
      {(activeAlerts.length > 0 || toleranceNotes.length > 0) && (
        <ScrollReveal animation="fade-up" delay={150}>
          <section className="space-y-3">
            <h2 className="font-display text-xl font-medium text-obsidian">Active Alerts</h2>
            {activeAlerts.map((ix) => (
              <div key={ix.id} className={`rounded-lg border px-4 py-3 text-sm ${SEVERITY_STYLES[ix.severity] ?? SEVERITY_STYLES.info}`}>
                <p className="font-medium mb-0.5">{ix.title}</p>
                <p className="text-xs opacity-90">{ix.description}</p>
              </div>
            ))}
            {toleranceNotes.map((t) => (
              <div key={t.substance} className="rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 px-4 py-3 text-sm">
                <p className="font-medium mb-0.5">{t.substance} — Tolerance ({t.level})</p>
                <p className="text-xs opacity-90">{t.message}</p>
              </div>
            ))}
          </section>
        </ScrollReveal>
      )}

      {/* ── 3. Recommendations + Sleep Readiness ── */}
      <ScrollReveal animation="fade-up" delay={200}>
        <section className="card-deco">
          <h2 className="font-display text-xl font-medium text-sage mb-3">
            Recommendations
          </h2>

          <div className="mb-4">
            <p className="text-graphite text-xs uppercase tracking-wide mb-2">Substances in use</p>
            <div className="flex flex-wrap gap-3">
              {SUBSTANCE_OPTIONS.map((opt) => {
                const checked = enabledSubstances.includes(opt.value);
                const disableUncheck = checked && enabledSubstances.length === 1;
                return (
                  <label key={opt.value} className={`flex items-center gap-2 text-sm ${disableUncheck ? "opacity-70" : ""}`}>
                    <input type="checkbox" checked={checked} disabled={disableUncheck}
                      onChange={() => toggleEnabledSubstance(opt.value)}
                      className="h-4 w-4 rounded border-sage text-sage focus:ring-sage" />
                    <span className="text-obsidian">{opt.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-graphite text-xs mt-2">
              Choose only the substances you actually use so recommendations stay focused.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-3">
              <span className="text-graphite text-sm inline-flex items-center gap-1.5">
                Mode
                <span className="relative group inline-flex items-center justify-center w-4 h-4 rounded-full border border-[var(--color-border-strong)] text-[10px] text-graphite cursor-help">
                  i
                  <span className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] leading-relaxed text-charcoal shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                    Health mode prioritizes earlier cutoffs and more conservative spacing for better sleep. Productivity mode allows more flexible timing while staying within daily safety limits.
                  </span>
                </span>
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="mode" value="health" checked={mode === "health"} onChange={() => handleModeChange("health")} className="text-sage focus:ring-sage" />
                <span className="text-sm text-obsidian">Health</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="mode" value="productivity" checked={mode === "productivity"} onChange={() => handleModeChange("productivity")} className="text-sage focus:ring-sage" />
                <span className="text-sm text-obsidian">Productivity</span>
              </label>
            </div>
            <span className="text-graphite/60">&middot;</span>
            <div className="flex items-center gap-2">
              <span className="text-graphite text-sm">Sleep by</span>
              <input type="time" value={sleepBy} onChange={(e) => handleSleepByChange(e.target.value)} className="input-deco text-sm w-24" />
            </div>
            <button type="button" onClick={fetchOptimizer} className="text-sm text-sage hover:underline disabled:opacity-50" disabled={loadingOptimizer}>
              {loadingOptimizer ? "\u2026" : "Refresh"}
            </button>
          </div>

          {loadingOptimizer && !optimizer ? (
            <p className="text-graphite text-sm">Loading\u2026</p>
          ) : optimizer ? (
            <div className="space-y-4">
              {/* Sleep readiness */}
              {optimizer.sleepReadiness && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-linen)] px-4 py-3">
                  <p className="text-sm text-obsidian font-medium">
                    {optimizer.sleepReadiness.readyAt
                      ? `\u{1F4A4} ${optimizer.sleepReadiness.message}`
                      : `\u2705 ${optimizer.sleepReadiness.message}`}
                  </p>
                </div>
              )}

              <div>
                <p className="text-graphite text-xs uppercase tracking-wide mb-1.5">Limits</p>
                <ul className="space-y-0.5 text-sm text-obsidian/90">
                  {visibleCutoffs.map((c) => (
                    <li key={c.substance} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                      <span className="text-sage font-medium">{c.label}</span>
                      <span>{c.message}</span>
                      <span className="text-graphite text-xs">max {c.maxDosesPerDay}/day</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-graphite text-xs uppercase tracking-wide mb-1.5">Next dose</p>
                <ul className="space-y-1.5">
                  {visibleNextDoseWindows.map((w) => {
                    const gov = optimizer.governmentLimits?.[w.substance];
                    const overGovMg = gov && w.totalMgToday != null && w.totalMgToday > gov.maxMgPerDay;
                    const overGovDoses = gov && w.dosesToday != null && w.dosesToday > gov.maxDosesPerDay;
                    const overGovernmentLimit = overGovMg || overGovDoses;
                    return (
                      <li key={w.substance} className={`text-sm py-2 px-2.5 rounded -mx-2.5 ${w.atLimit ? "bg-amber-50/60 text-amber-800" : "bg-[var(--color-surface)]/50 text-obsidian/90"}`}>
                        <span className="font-medium text-sage">{w.label}</span>{" "}
                        {w.message}
                        {w.adjustedMaxMg != null && (
                          <span className="block mt-0.5 text-xs text-amber-700">
                            Interaction-adjusted daily max: {w.adjustedMaxMg}mg
                          </span>
                        )}
                        {(w.totalMgToday != null && w.maxMgPerDay != null) && (
                          <span className={`block mt-0.5 text-xs ${overGovernmentLimit ? "text-red-600 font-medium" : "text-graphite"}`}>
                            {overGovernmentLimit ? "Exceeded recommended daily limit." : (
                              <>{w.totalMgToday} mg today{w.remainingMgToday != null && w.remainingMgToday > 0 && ` \u00B7 ${w.remainingMgToday} mg left`}</>
                            )}
                          </span>
                        )}
                        {w.dosesToday != null && !(w.totalMgToday != null && w.maxMgPerDay != null) && (
                          <span className={`block mt-0.5 text-xs ${overGovernmentLimit ? "text-red-600 font-medium" : "text-graphite"}`}>
                            {overGovernmentLimit ? "Exceeded recommended daily limit." : `${w.dosesToday} doses today`}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}
        </section>
      </ScrollReveal>

      {/* ── 4. Log a Dose ── */}
      <ScrollReveal animation="fade-up" delay={300}>
        <section className="card-deco max-w-xl">
          <h2 className="font-display text-xl font-medium text-sage mb-4">Log a dose</h2>
          <form onSubmit={submitLog} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-obsidian mb-1">Substance</label>
              <select value={formSubstance} onChange={(e) => { const v = e.target.value as Substance; setFormSubstance(v); if (v !== "CAFFEINE") { setFormDrinkId(""); setFormDrinkSizeId(""); } }} className="input-deco w-full">
                {SUBSTANCE_OPTIONS.filter((opt) => enabledSubstanceSet.has(opt.value)).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {formSubstance === "CAFFEINE" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-2">Log by</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="logBy" checked={formLogByDrink} onChange={() => setFormLogByDrink(true)} className="text-sage" />
                      <span className="text-sm text-obsidian">Drink</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="logBy" checked={!formLogByDrink} onChange={() => setFormLogByDrink(false)} className="text-sage" />
                      <span className="text-sm text-obsidian">Amount (mg)</span>
                    </label>
                  </div>
                </div>
                {formLogByDrink ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-obsidian mb-1">Drink</label>
                      <select value={formDrinkId} onChange={(e) => { setFormDrinkId(e.target.value); setFormDrinkSizeId(""); }} className="input-deco w-full">
                        <option value="">Select drink</option>
                        {drinks.map((d) => <option key={d.id} value={d.id}>{d.brand ? `${d.brand} ${d.name}` : d.name}</option>)}
                      </select>
                    </div>
                    {selectedDrink && (
                      <div>
                        <label className="block text-sm font-medium text-obsidian mb-1">Size</label>
                        <select value={formDrinkSizeId} onChange={(e) => setFormDrinkSizeId(e.target.value)} className="input-deco w-full">
                          <option value="">Select size</option>
                          {selectedDrink.sizes.map((s) => <option key={s.id} value={s.id}>{s.sizeLabel} — {s.caffeineMg} mg</option>)}
                        </select>
                        {selectedSize && <p className="text-graphite text-xs mt-0.5">~{selectedSize.caffeineMg} mg caffeine</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-obsidian mb-1">Amount (mg)</label>
                    <input type="number" min={0} step={1} value={formAmountMg} onChange={(e) => setFormAmountMg(e.target.value)} placeholder="e.g. 100" className="input-deco w-full" />
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-obsidian mb-1">Amount (mg)</label>
                <input type="number" min={0} step={1} value={formAmountMg} onChange={(e) => setFormAmountMg(e.target.value)} placeholder="e.g. 100" className="input-deco w-full" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-obsidian mb-1">When</label>
              <input type="datetime-local" value={formLoggedAt} onChange={(e) => setFormLoggedAt(e.target.value)} className="input-deco w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-obsidian mb-1">Notes</label>
              <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="input-deco w-full" />
            </div>
            <button type="submit" className="btn-deco-primary" disabled={submitting}>
              {submitting ? "Logging\u2026" : "Log dose"}
            </button>
          </form>
        </section>
      </ScrollReveal>

      {/* ── 5. Health Profile (collapsible) ── */}
      <ScrollReveal animation="fade-up" delay={350}>
        <section className="card-deco max-w-xl">
          <button type="button" onClick={() => setProfileCollapsed(!profileCollapsed)}
            className="w-full flex items-center justify-between text-left">
            <h2 className="font-display text-xl font-medium text-sage">Health Profile</h2>
            <span className="text-graphite text-sm">{profileCollapsed ? "\u25BC" : "\u25B2"}</span>
          </button>
          {!profileCollapsed && (
            <form onSubmit={saveHealthProfile} className="space-y-3 mt-4">
              <div>
                <label className="block text-sm font-medium text-obsidian mb-2">Units</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="profileUnits" checked={profileUnits === "imperial"} onChange={() => handleProfileUnitsChange("imperial")} className="text-sage" />
                    <span className="text-sm text-obsidian">Imperial (ft, in, lb)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="profileUnits" checked={profileUnits === "metric"} onChange={() => handleProfileUnitsChange("metric")} className="text-sage" />
                    <span className="text-sm text-obsidian">Metric (cm, kg)</span>
                  </label>
                </div>
              </div>
              {profileUnits === "imperial" ? (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
                  <div>
                    <label className="block text-sm font-medium text-obsidian mb-1">Weight (lb)</label>
                    <input type="number" min={66} max={661} step={0.5} value={profileWeight} onChange={(e) => setProfileWeight(e.target.value)} placeholder="e.g. 154" className="input-deco w-full" />
                  </div>
                  <div className="col-span-full grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
                    <div>
                      <label className="block text-sm font-medium text-obsidian mb-1">Height (ft)</label>
                      <input type="number" min={3} max={8} step={1} value={profileHeightFt} onChange={(e) => setProfileHeightFt(e.target.value)} placeholder="5" className="input-deco w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-obsidian mb-1">Height (in)</label>
                      <input type="number" min={0} max={11} step={1} value={profileHeightIn} onChange={(e) => setProfileHeightIn(e.target.value)} placeholder="10" className="input-deco w-full" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
                  <div>
                    <label className="block text-sm font-medium text-obsidian mb-1">Weight (kg)</label>
                    <input type="number" min={30} max={300} step={0.1} value={profileWeight} onChange={(e) => setProfileWeight(e.target.value)} placeholder="e.g. 70" className="input-deco w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-obsidian mb-1">Height (cm)</label>
                    <input type="number" min={100} max={250} step={1} value={profileHeight} onChange={(e) => setProfileHeight(e.target.value)} placeholder="e.g. 170" className="input-deco w-full" />
                  </div>
                </div>
              )}

              {/* New profile fields */}
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-1">Sex</label>
                  <select value={profileSex} onChange={(e) => setProfileSex(e.target.value)} className="input-deco w-full">
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-1">Smoking status</label>
                  <select value={profileSmokingStatus} onChange={(e) => setProfileSmokingStatus(e.target.value)} className="input-deco w-full">
                    <option value="">Not specified</option>
                    <option value="non-smoker">Non-smoker</option>
                    <option value="smoker">Smoker</option>
                    <option value="former-smoker">Former smoker</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-obsidian mb-1">Birth year</label>
                <input type="number" min={1920} max={new Date().getFullYear()} step={1} value={profileBirthYear} onChange={(e) => setProfileBirthYear(e.target.value)} placeholder="e.g. 1995" className="input-deco w-full max-w-[140px]" />
                <p className="text-graphite text-xs mt-1">Used to adjust half-life estimates for age-related metabolism changes.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian mb-1">Allergies</label>
                <input type="text" value={profileAllergies} onChange={(e) => setProfileAllergies(e.target.value)} placeholder="e.g. caffeine, penicillin" className="input-deco w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-obsidian mb-1">Medications</label>
                <input type="text" value={profileMedications} onChange={(e) => setProfileMedications(e.target.value)} placeholder="e.g. SSRIs, blood pressure" className="input-deco w-full" />
                <p className="text-graphite text-xs mt-1">Used to detect drug interactions and adjust half-life estimates.</p>
              </div>

              {optimizer?.personalizedHalfLives && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-linen)] px-3 py-2">
                  <p className="text-xs text-graphite font-medium mb-1">Personalized half-lives</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-obsidian/80">
                    {enabledSubstances.map((s) => (
                      <span key={s}>
                        {SUBSTANCE_OPTIONS.find((o) => o.value === s)?.label}: {optimizer.personalizedHalfLives?.[s]}h
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="btn-deco-primary" disabled={profileSaving}>
                {profileSaving ? "Saving\u2026" : "Save profile"}
              </button>
            </form>
          )}
        </section>
      </ScrollReveal>

      {/* ── 6. Usage Analytics ── */}
      {analyticsData && Object.keys(analyticsData.analytics).length > 0 && (
        <ScrollReveal animation="fade-up" delay={400}>
          <section className="card-deco">
            <h2 className="font-display text-xl font-medium text-sage mb-4">Usage Analytics</h2>

            {analyticsData.cleanestStreak > 0 && (
              <p className="text-sm text-obsidian/80 mb-3">
                Longest recent stimulant-free streak: <span className="font-medium">{analyticsData.cleanestStreak} day{analyticsData.cleanestStreak > 1 ? "s" : ""}</span>
              </p>
            )}

            <div className="space-y-5">
              {enabledSubstances.map((substance) => {
                const stats = analyticsData.analytics[substance];
                if (!stats) return null;
                return (
                  <div key={substance}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm text-obsidian">
                        {SUBSTANCE_OPTIONS.find((o) => o.value === substance)?.label}
                      </span>
                      <span className="text-xs text-graphite">
                        {TREND_ICONS[stats.trend]} {stats.trend}
                      </span>
                    </div>
                    <div className="grid gap-3 text-sm text-obsidian/80 mb-2 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                      <div>
                        <span className="text-graphite text-xs block">7-day avg</span>
                        <span className="font-medium">{stats.avg7d} mg/day</span>
                        <span className="text-xs text-graphite ml-1">({stats.doses7d} doses)</span>
                      </div>
                      <div>
                        <span className="text-graphite text-xs block">30-day avg</span>
                        <span className="font-medium">{stats.avg30d} mg/day</span>
                        <span className="text-xs text-graphite ml-1">({stats.doses30d} doses)</span>
                      </div>
                    </div>
                    {/* 14-day sparkline */}
                    <Sparkline data={stats.dailyTotals14d} substance={substance} />
                  </div>
                );
              })}
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* ── 7. Today's schedule ── */}
      {optimizer?.eventsToday && optimizer.eventsToday.length > 0 && (
        <ScrollReveal animation="fade-up" delay={450}>
          <section className="card-deco max-w-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-xl font-medium text-sage">Today&apos;s schedule</h2>
              <Link href="/calendar" className="text-sm text-sage hover:underline">Calendar</Link>
            </div>
            <ul className="space-y-1 text-sm text-obsidian/80 mb-3">
              {optimizer.eventsToday.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.title}</span>
                  <span className="ml-1">{format(new Date(e.start), "h:mm a")}{!e.allDay && ` – ${format(new Date(e.end), "h:mm a")}`}</span>
                </li>
              ))}
            </ul>
            {optimizer.nextEventToday && visiblePeakSuggestions.length > 0 && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-linen)] p-3">
                <h3 className="font-medium text-obsidian mb-1">{optimizer.nextEventToday.title}</h3>
                <p className="text-graphite text-xs mb-2">
                  {format(new Date(optimizer.nextEventToday.start), "h:mm a")} – {format(new Date(optimizer.nextEventToday.end), "h:mm a")}
                </p>
                <ul className="space-y-0.5 text-sm">
                  {visiblePeakSuggestions.map((d) => (
                    <li key={d.substance} className={d.afterCutoff ? "text-amber-700" : "text-obsidian/80"}>
                      {d.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </ScrollReveal>
      )}

      {/* ── 8. Recent Logs ── */}
      <ScrollReveal animation="fade-up" delay={500}>
        <section className="card-deco max-w-xl">
          <h2 className="font-display text-xl font-medium text-sage mb-4">Recent logs</h2>
          {loadingLogs ? (
            <p className="text-obsidian/60">Loading\u2026</p>
          ) : logs.length === 0 ? (
            <p className="text-obsidian/60">No logs yet.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-wrap items-baseline gap-2 text-sm border-b border-[var(--color-border)] pb-2 last:border-0">
                  <span className="font-medium text-sage">{log.substance}</span>
                  {(log.amount || log.amountMg != null) && (
                    <span className="text-obsidian/80">{log.amount || `${log.amountMg}mg`}</span>
                  )}
                  <span className="text-graphite">{format(new Date(log.loggedAt), "MMM d, h:mm a")}</span>
                  {log.notes && <span className="text-obsidian/60 italic">{log.notes}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </ScrollReveal>
    </div>
  );
}

/* ── Sparkline mini-component ── */

const SPARK_COLORS: Record<string, string> = {
  CAFFEINE: "#6D7355",
  ADDERALL: "#AFBEC6",
  DEXEDRINE: "#8B9EC3",
  NICOTINE: "#C5A682",
};

function Sparkline({ data, substance }: { data: DailyTotal[]; substance: Substance }) {
  if (!data || data.length === 0) return null;
  const maxMg = Math.max(...data.map((d) => d.totalMg), 1);
  const w = 280;
  const h = 40;
  const barW = (w - (data.length - 1) * 2) / data.length;
  const color = SPARK_COLORS[substance] ?? "#6D7355";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[280px] h-10">
      {data.map((d, i) => {
        const barH = Math.max(1, (d.totalMg / maxMg) * (h - 4));
        return (
          <rect
            key={d.date}
            x={i * (barW + 2)}
            y={h - barH}
            width={barW}
            height={barH}
            fill={color}
            opacity={d.totalMg > 0 ? 0.75 : 0.15}
            rx={1}
          />
        );
      })}
    </svg>
  );
}
