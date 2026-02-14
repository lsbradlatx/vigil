"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

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

type OptimizerResponse = {
  now: string;
  sleepBy: string;
  mode: OptimizationMode;
  cutoffs: CutoffResult[];
  governmentLimits?: GovernmentLimits;
  nextDoseWindows: NextDoseWindow[];
  eventsToday?: CalendarEvent[];
  nextEventToday?: { id: string; title: string; start: string; end: string } | null;
  doseForPeakAtNextEvent?: DoseForPeak[];
};

const SUBSTANCE_OPTIONS: { value: Substance; label: string }[] = [
  { value: "CAFFEINE", label: "Caffeine" },
  { value: "ADDERALL", label: "Adderall" },
  { value: "DEXEDRINE", label: "Dexedrine" },
  { value: "NICOTINE", label: "Nicotine" },
];

export default function StimulantPage() {
  const [logs, setLogs] = useState<StimulantLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [optimizer, setOptimizer] = useState<OptimizerResponse | null>(null);
  const [loadingOptimizer, setLoadingOptimizer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formSubstance, setFormSubstance] = useState<Substance>("CAFFEINE");
  const [formAmountMg, setFormAmountMg] = useState<string>("");
  const [formLoggedAt, setFormLoggedAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [sleepBy, setSleepBy] = useState("22:00");
  const [mode, setMode] = useState<OptimizationMode>("health");

  useEffect(() => {
    const savedSleep = localStorage.getItem("stoicsips_sleepBy");
    const savedMode = localStorage.getItem("stoicsips_mode");
    if (savedSleep) setSleepBy(savedSleep);
    if (savedMode === "health" || savedMode === "productivity") setMode(savedMode as OptimizationMode);
  }, []);

  const handleSleepByChange = (value: string) => {
    setSleepBy(value);
    localStorage.setItem("stoicsips_sleepBy", value);
  };
  const handleModeChange = (value: OptimizationMode) => {
    setMode(value);
    localStorage.setItem("stoicsips_mode", value);
  };

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/stimulant?limit=30");
      if (!res.ok) throw new Error("Failed to load logs");
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const hasOptimizerData = useRef(false);
  const fetchOptimizer = useCallback(async () => {
    if (!hasOptimizerData.current) setLoadingOptimizer(true);
    try {
      setError(null);
      const today = new Date().toISOString().slice(0, 10);
      const params = new URLSearchParams({ sleepBy, mode, date: today });
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
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchOptimizer();
  }, [fetchOptimizer]);

  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/stimulant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          substance: formSubstance,
          amountMg: formAmountMg.trim() ? parseFloat(formAmountMg) : null,
          loggedAt: new Date(formLoggedAt).toISOString(),
          notes: formNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to log");
      const created = await res.json();
      setLogs((prev) => [created, ...prev]);
      setFormAmountMg("");
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
        For awareness only; not medical advice. Recommended limits are shown below. Your choice of health or productivity affects suggestion timing only (health: earlier cutoffs, longer spacing; productivity: later cutoffs, shorter spacing).
      </p>

      {error && (
        <div className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-linen)] text-obsidian px-4 py-2 text-sm">
          {error}
        </div>
      )}

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
              onChange={(e) => setFormSubstance(e.target.value as Substance)}
              className="input-deco w-full"
            >
              {SUBSTANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              Amount (mg)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={formAmountMg}
              onChange={(e) => setFormAmountMg(e.target.value)}
              placeholder="e.g. 100"
              className="input-deco w-full"
            />
            <p className="text-graphite text-xs mt-0.5">Used to recommend next dose by total mg per day.</p>
          </div>
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
              Notes (optional)
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
        <h2 className="font-display text-xl font-medium text-sage mb-4">
          Recommendations
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-obsidian mb-2">
            Recommended dose mode
          </label>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="health"
                checked={mode === "health"}
                onChange={() => handleModeChange("health")}
                className="text-sage focus:ring-sage"
              />
              <span className="text-obsidian">Prioritize health</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="productivity"
                checked={mode === "productivity"}
                onChange={() => handleModeChange("productivity")}
                className="text-sage focus:ring-sage"
              />
              <span className="text-obsidian">Prioritize productivity</span>
            </label>
          </div>
          <p className="text-obsidian/60 text-xs mt-1">
            Suggestions stay within recommended limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <label className="text-obsidian">Sleep by:</label>
          <input
            type="time"
            value={sleepBy}
            onChange={(e) => handleSleepByChange(e.target.value)}
            className="input-deco"
          />
          <button
            type="button"
            onClick={fetchOptimizer}
            className="btn-deco text-sm"
            disabled={loadingOptimizer}
          >
            {loadingOptimizer ? "Loading…" : "Refresh"}
          </button>
        </div>
        {loadingOptimizer && !optimizer ? (
          <p className="text-obsidian/60">Loading…</p>
        ) : optimizer ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-obsidian mb-2">Recommended limits</h3>
              <ul className="space-y-1 text-obsidian/80">
                {optimizer.cutoffs.map((c) => (
                  <li key={c.substance} className="flex items-center gap-2 flex-wrap">
                    <span className="text-sage font-medium">{c.label}:</span>
                    {c.message}
                    <span className="text-obsidian/60 text-xs">
                      (max {c.maxDosesPerDay}/day)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-obsidian mb-2">
                Next dose windows
              </h3>
              <ul className="space-y-2">
                {optimizer.nextDoseWindows.map((w) => {
                  const gov = optimizer.governmentLimits?.[w.substance];
                  const overGovMg = gov && w.totalMgToday != null && w.totalMgToday > gov.maxMgPerDay;
                  const overGovDoses = gov && w.dosesToday != null && w.dosesToday > gov.maxDosesPerDay;
                  const overGovernmentLimit = overGovMg || overGovDoses;
                  return (
                    <li
                      key={w.substance}
                      className={`rounded-md border p-3 text-sm ${
                        w.atLimit
                          ? "border-amber-500/60 bg-amber-50/50"
                          : "border-[var(--color-border)] bg-[var(--color-surface)]"
                      }`}
                    >
                      <span className="font-medium text-sage">{w.label}:</span>{" "}
                      {w.message}
                      {(w.totalMgToday != null && w.maxMgPerDay != null) && (
                        <span className={`block mt-1 text-xs ${overGovernmentLimit ? "text-red-600 font-medium" : "text-graphite"}`}>
                          {w.totalMgToday}mg today
                          {w.remainingMgToday != null && w.remainingMgToday > 0 && ` · ${w.remainingMgToday}mg remaining`}
                        </span>
                      )}
                      {w.dosesToday != null && !(w.totalMgToday != null && w.maxMgPerDay != null) && (
                        <span className={`block mt-1 text-xs ${overGovernmentLimit ? "text-red-600 font-medium" : "text-graphite"}`}>
                          {w.dosesToday} doses today
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
              <h3 className="font-medium text-obsidian mb-1">For your next event: {optimizer.nextEventToday.title}</h3>
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
          <p className="text-obsidian/60">No logs yet. Log a dose above.</p>
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
