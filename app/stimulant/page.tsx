"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { getCachedRouteData, setCachedRouteData } from "@/lib/route-prefetch";

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

type HealthProfileData = {
  weightKg?: number | null;
  heightCm?: number | null;
  allergies?: string | null;
  medications?: string | null;
};

type OptimizerResponse = {
  now: string;
  sleepBy: string;
  mode: OptimizationMode;
  cutoffs: CutoffResult[];
  governmentLimits?: GovernmentLimits;
  nextDoseWindows: NextDoseWindow[];
  healthProfile?: HealthProfileData;
  eventsToday?: CalendarEvent[];
  nextEventToday?: { id: string; title: string; start: string; end: string } | null;
  doseForPeakAtNextEvent?: DoseForPeak[];
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

function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG * 10) / 10;
}
function lbToKg(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 100) / 100;
}
function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = cm / CM_PER_IN;
  return { ft: Math.floor(totalIn / IN_PER_FT), in: Math.round(totalIn % IN_PER_FT) };
}
function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * IN_PER_FT + inch) * CM_PER_IN);
}

export default function StimulantPage() {
  const [logs, setLogs] = useState<StimulantLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [optimizer, setOptimizer] = useState<OptimizerResponse | null>(null);
  const [loadingOptimizer, setLoadingOptimizer] = useState(false);
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
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    const savedSleep = localStorage.getItem("vigil_sleepBy");
    const savedMode = localStorage.getItem("vigil_mode");
    const savedUnits = localStorage.getItem("vigil_profileUnits");
    if (savedSleep) setSleepBy(savedSleep);
    if (savedMode === "health" || savedMode === "productivity") setMode(savedMode as OptimizationMode);
    if (savedUnits === "imperial" || savedUnits === "metric") setProfileUnits(savedUnits);
  }, []);

  const handleSleepByChange = (value: string) => {
    setSleepBy(value);
    localStorage.setItem("vigil_sleepBy", value);
  };
  const handleModeChange = (value: OptimizationMode) => {
    setMode(value);
    localStorage.setItem("vigil_mode", value);
  };

  const applyHealthProfileData = useCallback((data: HealthProfileData | null, units: "imperial" | "metric") => {
    if (!data) {
      setHealthProfile(null);
      return;
    }
    setHealthProfile(data);
    setProfileAllergies(data.allergies ?? "");
    setProfileMedications(data.medications ?? "");
    const kg = data.weightKg;
    const cm = data.heightCm;
    if (units === "imperial") {
      setProfileWeight(kg != null && Number.isFinite(kg) ? String(kgToLb(kg)) : "");
      if (cm != null && Number.isFinite(cm)) {
        const { ft, in: inch } = cmToFtIn(cm);
        setProfileHeightFt(String(ft));
        setProfileHeightIn(String(inch));
      } else {
        setProfileHeightFt("");
        setProfileHeightIn("");
      }
      setProfileHeight("");
    } else {
      setProfileWeight(kg != null && Number.isFinite(kg) ? String(kg) : "");
      setProfileHeight(cm != null && Number.isFinite(cm) ? String(cm) : "");
      setProfileHeightFt("");
      setProfileHeightIn("");
    }
  }, []);

  const fetchHealthProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/health-profile");
      if (res.ok) {
        const data = await res.json();
        applyHealthProfileData(data, profileUnits);
      } else {
        setHealthProfile(null);
      }
    } catch {
      setHealthProfile(null);
    }
  }, [applyHealthProfileData, profileUnits]);

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
    return {
      weightKg: Number.isFinite(w) ? w : null,
      heightCm: Number.isFinite(h) ? h : null,
    };
  };

  const handleProfileUnitsChange = (units: "imperial" | "metric") => {
    if (units === profileUnits) return;
    if (units === "metric") {
      const w = profileWeight.trim() ? parseFloat(profileWeight) : NaN;
      const ft = profileHeightFt.trim() ? parseFloat(profileHeightFt) : NaN;
      const inch = profileHeightIn.trim() ? parseFloat(profileHeightIn) : NaN;
      if (Number.isFinite(w)) setProfileWeight(String(lbToKg(w).toFixed(1)));
      else setProfileWeight("");
      if (Number.isFinite(ft) || Number.isFinite(inch)) setProfileHeight(String(ftInToCm(ft || 0, inch || 0)));
      else setProfileHeight("");
      setProfileHeightFt("");
      setProfileHeightIn("");
    } else {
      const w = profileWeight.trim() ? parseFloat(profileWeight) : NaN;
      const h = profileHeight.trim() ? parseFloat(profileHeight) : NaN;
      if (Number.isFinite(w)) setProfileWeight(String(kgToLb(w)));
      else setProfileWeight("");
      if (Number.isFinite(h)) {
        const { ft, in: inch } = cmToFtIn(h);
        setProfileHeightFt(String(ft));
        setProfileHeightIn(String(inch));
      } else {
        setProfileHeightFt("");
        setProfileHeightIn("");
      }
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
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setHealthProfile(data);
      setLoadingOptimizer(true);
      const _now = new Date();
      const _ds = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());
      const _de = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate(), 23, 59, 59, 999);
      const params = new URLSearchParams({ sleepBy, mode, dayStart: _ds.toISOString(), dayEnd: _de.toISOString() });
      const optRes = await fetch(`/api/stimulant/optimizer?${params}`);
      if (optRes.ok) setOptimizer(await optRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
      setLoadingOptimizer(false);
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
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoadingLogs(false);
    }
  }, [getLogsUrl]);

  const hasOptimizerData = useRef(false);
  const fetchOptimizer = useCallback(async () => {
    if (!hasOptimizerData.current) setLoadingOptimizer(true);
    try {
      setError(null);
      const _now2 = new Date();
      const _ds2 = new Date(_now2.getFullYear(), _now2.getMonth(), _now2.getDate());
      const _de2 = new Date(_now2.getFullYear(), _now2.getMonth(), _now2.getDate(), 23, 59, 59, 999);
      const params = new URLSearchParams({ sleepBy, mode, dayStart: _ds2.toISOString(), dayEnd: _de2.toISOString() });
      const res = await fetch(`/api/stimulant/optimizer?${params}`);
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data = await res.json();
      setOptimizer(data);
      hasOptimizerData.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoadingOptimizer(false);
    }
  }, [sleepBy, mode]);

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
    const _now3 = new Date();
    const _ds3 = new Date(_now3.getFullYear(), _now3.getMonth(), _now3.getDate());
    const _de3 = new Date(_now3.getFullYear(), _now3.getMonth(), _now3.getDate(), 23, 59, 59, 999);
    const optimizerParams = new URLSearchParams({ sleepBy, mode, dayStart: _ds3.toISOString(), dayEnd: _de3.toISOString() });
    const optimizerUrl = `/api/stimulant/optimizer?${optimizerParams}`;
    Promise.all([
      fetch("/api/health-profile")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: HealthProfileData | null) => {
          if (data) applyHealthProfileData(data, profileUnits);
          else setHealthProfile(null);
          return data;
        })
        .catch(() => { setHealthProfile(null); return null; }),
      fetch(getLogsUrl())
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load logs");
          return res.json();
        })
        .then((data: StimulantLog[]) => {
          setLogs(data);
          return data;
        })
        .catch(() => { setLoadingLogs(false); return []; }),
      fetch(optimizerUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load recommendations");
          return res.json();
        })
        .then((data: OptimizerResponse) => {
          setOptimizer(data);
          hasOptimizerData.current = true;
          return data;
        })
        .catch(() => { setLoadingOptimizer(false); return null; }),
    ]).then(([healthProfile, logs, optimizer]) => {
      if (optimizer != null && Array.isArray(logs)) {
        setCachedRouteData("/stimulant", { healthProfile: healthProfile ?? null, logs, optimizer });
      }
    }).finally(() => {
      setLoadingLogs(false);
      setLoadingOptimizer(false);
    });
  }, [sleepBy, mode, profileUnits, applyHealthProfileData, getLogsUrl]);

  useEffect(() => {
    if (formSubstance === "CAFFEINE" && formLogByDrink && drinks.length === 0) {
      fetch("/api/drinks")
        .then((res) => (res.ok ? res.json() : []))
        .then(setDrinks)
        .catch(() => setDrinks([]));
    }
  }, [formSubstance, formLogByDrink, drinks.length]);

  const selectedDrink = drinks.find((d) => d.id === formDrinkId);
  const selectedSize = selectedDrink?.sizes.find((s) => s.id === formDrinkSizeId);

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
      if (useDrink) {
        body.drinkSizeId = formDrinkSizeId;
      } else {
        body.amountMg = formAmountMg.trim() ? parseFloat(formAmountMg) : null;
      }
      const res = await fetch("/api/stimulant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to log");
      const created = await res.json();
      setLogs((prev) => [created, ...prev]);
      setFormAmountMg("");
      setFormDrinkId("");
      setFormDrinkSizeId("");
      setFormNotes("");
      setFormLoggedAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      fetchOptimizer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-medium text-obsidian">
        Stimulant Optimizer
      </h1>

      <p className="text-graphite text-sm max-w-xl">
        For awareness only; not medical advice.
      </p>

      {error && (
        <div className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-linen)] text-obsidian px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <section className="card-deco max-w-xl">
        <h2 className="font-display text-xl font-medium text-sage mb-4">
          Health profile
        </h2>
        <form onSubmit={saveHealthProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-obsidian mb-2">Units</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="profileUnits"
                  checked={profileUnits === "imperial"}
                  onChange={() => handleProfileUnitsChange("imperial")}
                  className="text-sage"
                />
                <span className="text-sm text-obsidian">Imperial (ft, in, lb)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="profileUnits"
                  checked={profileUnits === "metric"}
                  onChange={() => handleProfileUnitsChange("metric")}
                  className="text-sage"
                />
                <span className="text-sm text-obsidian">Metric (cm, kg)</span>
              </label>
            </div>
          </div>
          {profileUnits === "imperial" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-obsidian mb-1">Weight (lb)</label>
                <input
                  type="number"
                  min={66}
                  max={661}
                  step={0.5}
                  value={profileWeight}
                  onChange={(e) => setProfileWeight(e.target.value)}
                  placeholder="e.g. 154"
                  className="input-deco w-full"
                />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-1">Height (ft)</label>
                  <input
                    type="number"
                    min={3}
                    max={8}
                    step={1}
                    value={profileHeightFt}
                    onChange={(e) => setProfileHeightFt(e.target.value)}
                    placeholder="5"
                    className="input-deco w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-1">Height (in)</label>
                  <input
                    type="number"
                    min={0}
                    max={11}
                    step={1}
                    value={profileHeightIn}
                    onChange={(e) => setProfileHeightIn(e.target.value)}
                    placeholder="10"
                    className="input-deco w-full"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-obsidian mb-1">Weight (kg)</label>
                <input
                  type="number"
                  min={30}
                  max={300}
                  step={0.1}
                  value={profileWeight}
                  onChange={(e) => setProfileWeight(e.target.value)}
                  placeholder="e.g. 70"
                  className="input-deco w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-obsidian mb-1">Height (cm)</label>
                <input
                  type="number"
                  min={100}
                  max={250}
                  step={1}
                  value={profileHeight}
                  onChange={(e) => setProfileHeight(e.target.value)}
                  placeholder="e.g. 170"
                  className="input-deco w-full"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">Allergies</label>
            <input
              type="text"
              value={profileAllergies}
              onChange={(e) => setProfileAllergies(e.target.value)}
              placeholder="e.g. caffeine, penicillin"
              className="input-deco w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">Medications</label>
            <input
              type="text"
              value={profileMedications}
              onChange={(e) => setProfileMedications(e.target.value)}
              placeholder="e.g. SSRIs, blood pressure"
              className="input-deco w-full"
            />
          </div>
          <button type="submit" className="btn-deco-primary" disabled={profileSaving}>
            {profileSaving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="card-deco max-w-xl">
        <h2 className="font-display text-xl font-medium text-sage mb-4">
          Log a dose
        </h2>
        <form onSubmit={submitLog} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              Substance
            </label>
            <select
              value={formSubstance}
              onChange={(e) => {
                const v = e.target.value as Substance;
                setFormSubstance(v);
                if (v !== "CAFFEINE") {
                  setFormDrinkId("");
                  setFormDrinkSizeId("");
                }
              }}
              className="input-deco w-full"
            >
              {SUBSTANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {formSubstance === "CAFFEINE" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-obsidian mb-2">Log by</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="logBy"
                      checked={formLogByDrink}
                      onChange={() => setFormLogByDrink(true)}
                      className="text-sage"
                    />
                    <span className="text-sm text-obsidian">Drink</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="logBy"
                      checked={!formLogByDrink}
                      onChange={() => setFormLogByDrink(false)}
                      className="text-sage"
                    />
                    <span className="text-sm text-obsidian">Amount (mg)</span>
                  </label>
                </div>
              </div>
              {formLogByDrink ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-obsidian mb-1">Drink</label>
                    <select
                      value={formDrinkId}
                      onChange={(e) => {
                        setFormDrinkId(e.target.value);
                        setFormDrinkSizeId("");
                      }}
                      className="input-deco w-full"
                    >
                      <option value="">Select drink</option>
                      {drinks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.brand ? `${d.brand} ${d.name}` : d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedDrink && (
                    <div>
                      <label className="block text-sm font-medium text-obsidian mb-1">Size</label>
                      <select
                        value={formDrinkSizeId}
                        onChange={(e) => setFormDrinkSizeId(e.target.value)}
                        className="input-deco w-full"
                      >
                        <option value="">Select size</option>
                        {selectedDrink.sizes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.sizeLabel} — {s.caffeineMg} mg
                          </option>
                        ))}
                      </select>
                      {selectedSize && (
                        <p className="text-graphite text-xs mt-0.5">
                          ~{selectedSize.caffeineMg} mg caffeine
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-1">Amount (mg)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formAmountMg}
                    onChange={(e) => setFormAmountMg(e.target.value)}
                    placeholder="e.g. 100"
                    className="input-deco w-full"
                  />
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-obsidian mb-1">Amount (mg)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={formAmountMg}
                onChange={(e) => setFormAmountMg(e.target.value)}
                placeholder="e.g. 100"
                className="input-deco w-full"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              When
            </label>
            <input
              type="datetime-local"
              value={formLoggedAt}
              onChange={(e) => setFormLoggedAt(e.target.value)}
              className="input-deco w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              Notes
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="input-deco w-full"
            />
          </div>
          <button
            type="submit"
            className="btn-deco-primary"
            disabled={submitting}
          >
            {submitting ? "Logging…" : "Log dose"}
          </button>
        </form>
      </section>

      <section className="card-deco max-w-xl">
        <h2 className="font-display text-xl font-medium text-sage mb-3">
          Recommendations
        </h2>

        {optimizer?.healthProfile?.medications && (
          <p className="text-amber-700 dark:text-amber-400 text-xs mb-3">
            Discuss with your doctor.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-graphite text-sm">Mode</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="health"
                checked={mode === "health"}
                onChange={() => handleModeChange("health")}
                className="text-sage focus:ring-sage"
              />
              <span className="text-sm text-obsidian">Health</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="productivity"
                checked={mode === "productivity"}
                onChange={() => handleModeChange("productivity")}
                className="text-sage focus:ring-sage"
              />
              <span className="text-sm text-obsidian">Productivity</span>
            </label>
          </div>
          <span className="text-graphite/60">·</span>
          <div className="flex items-center gap-2">
            <span className="text-graphite text-sm">Sleep by</span>
            <input
              type="time"
              value={sleepBy}
              onChange={(e) => handleSleepByChange(e.target.value)}
              className="input-deco text-sm w-24"
            />
          </div>
          <button
            type="button"
            onClick={fetchOptimizer}
            className="text-sm text-sage hover:underline disabled:opacity-50"
            disabled={loadingOptimizer}
          >
            {loadingOptimizer ? "…" : "Refresh"}
          </button>
        </div>

        {loadingOptimizer && !optimizer ? (
          <p className="text-graphite text-sm">Loading…</p>
        ) : optimizer ? (
          <div className="space-y-4">
            <div>
              <p className="text-graphite text-xs uppercase tracking-wide mb-1.5">Limits</p>
              <ul className="space-y-0.5 text-sm text-obsidian/90">
                {optimizer.cutoffs.map((c) => (
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
                {optimizer.nextDoseWindows.map((w) => {
                  const gov = optimizer.governmentLimits?.[w.substance];
                  const overGovMg = gov && w.totalMgToday != null && w.totalMgToday > gov.maxMgPerDay;
                  const overGovDoses = gov && w.dosesToday != null && w.dosesToday > gov.maxDosesPerDay;
                  const overGovernmentLimit = overGovMg || overGovDoses;
                  return (
                    <li
                      key={w.substance}
                      className={`text-sm py-2 px-2.5 rounded -mx-2.5 ${
                        w.atLimit
                          ? "bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200"
                          : "bg-[var(--color-surface)]/50 text-obsidian/90"
                      }`}
                    >
                      <span className="font-medium text-sage">{w.label}</span>{" "}
                      {w.message}
                      {(w.totalMgToday != null && w.maxMgPerDay != null) && (
                        <span className={`block mt-0.5 text-xs ${overGovernmentLimit ? "text-red-600 dark:text-red-400 font-medium" : "text-graphite"}`}>
                          {overGovernmentLimit ? "Well you're fucking dead. Congrats." : (
                            <>
                              {w.totalMgToday} mg today
                              {w.remainingMgToday != null && w.remainingMgToday > 0 && ` · ${w.remainingMgToday} mg left`}
                            </>
                          )}
                        </span>
                      )}
                      {w.dosesToday != null && !(w.totalMgToday != null && w.maxMgPerDay != null) && (
                        <span className={`block mt-0.5 text-xs ${overGovernmentLimit ? "text-red-600 dark:text-red-400 font-medium" : "text-graphite"}`}>
                          {overGovernmentLimit ? "Well you're fucking dead. Congrats." : `${w.dosesToday} doses today`}
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

      {optimizer?.eventsToday && optimizer.eventsToday.length > 0 && (
        <section className="card-deco max-w-xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-xl font-medium text-sage">
              Today&apos;s schedule
            </h2>
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
          {optimizer.nextEventToday && optimizer.doseForPeakAtNextEvent && optimizer.doseForPeakAtNextEvent.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-linen)] p-3">
              <h3 className="font-medium text-obsidian mb-1">{optimizer.nextEventToday.title}</h3>
              <p className="text-graphite text-xs mb-2">
                {format(new Date(optimizer.nextEventToday.start), "h:mm a")} – {format(new Date(optimizer.nextEventToday.end), "h:mm a")}
              </p>
              <ul className="space-y-0.5 text-sm">
                {optimizer.doseForPeakAtNextEvent.map((d) => (
                  <li key={d.substance} className={d.afterCutoff ? "text-amber-700" : "text-obsidian/80"}>
                    {d.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="card-deco max-w-xl">
        <h2 className="font-display text-xl font-medium text-sage mb-4">
          Recent logs
        </h2>
        {loadingLogs ? (
          <p className="text-obsidian/60">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-obsidian/60">No logs yet.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-baseline gap-2 text-sm border-b border-[var(--color-border)] pb-2 last:border-0"
              >
                <span className="font-medium text-sage">{log.substance}</span>
                {(log.amount || log.amountMg != null) && (
                  <span className="text-obsidian/80">
                    {log.amount || `${log.amountMg}mg`}
                  </span>
                )}
                <span className="text-graphite">
                  {format(new Date(log.loggedAt), "MMM d, h:mm a")}
                </span>
                {log.notes && (
                  <span className="text-obsidian/60 italic">{log.notes}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
