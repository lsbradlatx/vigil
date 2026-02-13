"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

type Substance = "CAFFEINE" | "ADDERALL" | "NICOTINE";

type StimulantLog = {
  id: string;
  substance: Substance;
  amount: string | null;
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

type OptimizerResponse = {
  now: string;
  sleepBy: string;
  mode: OptimizationMode;
  cutoffs: CutoffResult[];
  nextDoseWindows: NextDoseWindow[];
  eventsToday?: CalendarEvent[];
  nextEventToday?: { id: string; title: string; start: string; end: string } | null;
  doseForPeakAtNextEvent?: DoseForPeak[];
};

const SUBSTANCE_OPTIONS: { value: Substance; label: string }[] = [
  { value: "CAFFEINE", label: "Caffeine" },
  { value: "ADDERALL", label: "Adderall" },
  { value: "NICOTINE", label: "Nicotine" },
];

export default function StimulantPage() {
  const [logs, setLogs] = useState<StimulantLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [optimizer, setOptimizer] = useState<OptimizerResponse | null>(null);
  const [loadingOptimizer, setLoadingOptimizer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formSubstance, setFormSubstance] = useState<Substance>("CAFFEINE");
  const [formAmount, setFormAmount] = useState("");
  const [formLoggedAt, setFormLoggedAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [sleepBy, setSleepBy] = useState("22:00");
  const [mode, setMode] = useState<OptimizationMode>("health");

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

  const fetchOptimizer = useCallback(async () => {
    setLoadingOptimizer(true);
    try {
      setError(null);
      const today = new Date().toISOString().slice(0, 10);
      const params = new URLSearchParams({ sleepBy, mode, date: today });
      const res = await fetch(`/api/stimulant/optimizer?${params}`);
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data = await res.json();
      setOptimizer(data);
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
          amount: formAmount.trim() || null,
          loggedAt: new Date(formLoggedAt).toISOString(),
          notes: formNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to log");
      const created = await res.json();
      setLogs((prev) => [created, ...prev]);
      setFormAmount("");
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
      <h1 className="font-serif text-3xl font-semibold text-charcoal">
        Stimulant Optimizer
      </h1>

      <p className="text-charcoal/70 text-sm max-w-xl">
        For awareness only; not medical advice. Choose a mode below — both stay within recommended limits. Health: earlier cutoffs, longer spacing, fewer doses. Productivity: later cutoffs, shorter spacing, more doses (still capped).
      </p>

      {error && (
        <div className="rounded-deco border border-red-300 bg-red-50 text-red-800 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <section className="card-deco max-w-xl">
        <h2 className="font-serif text-xl font-semibold text-forest mb-4">
          Log a dose
        </h2>
        <form onSubmit={submitLog} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
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
            <label className="block text-sm font-medium text-charcoal mb-1">
              Amount (optional)
            </label>
            <input
              type="text"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="e.g. 1 cup, 10mg"
              className="input-deco w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
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
            <label className="block text-sm font-medium text-charcoal mb-1">
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
        <h2 className="font-serif text-xl font-semibold text-forest mb-4">
          Recommendations
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-charcoal mb-2">
            Recommended dose mode
          </label>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="health"
                checked={mode === "health"}
                onChange={() => setMode("health")}
                className="text-gold focus:ring-gold"
              />
              <span className="text-charcoal">Prioritize health</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="productivity"
                checked={mode === "productivity"}
                onChange={() => setMode("productivity")}
                className="text-gold focus:ring-gold"
              />
              <span className="text-charcoal">Prioritize productivity</span>
            </label>
          </div>
          <p className="text-charcoal/60 text-xs mt-1">
            Neither mode recommends doses above recommended limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <label className="text-charcoal">Sleep by:</label>
          <input
            type="time"
            value={sleepBy}
            onChange={(e) => setSleepBy(e.target.value)}
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
          <p className="text-charcoal/60">Loading…</p>
        ) : optimizer ? (
          <div className="space-y-6">
            <p className="text-charcoal/70 text-sm">
              Using <strong>{optimizer.mode === "health" ? "health" : "productivity"}</strong> mode.
            </p>
            <div>
              <h3 className="font-medium text-charcoal mb-2">Cutoff times</h3>
              <ul className="space-y-1 text-charcoal/80">
                {optimizer.cutoffs.map((c) => (
                  <li key={c.substance} className="flex items-center gap-2 flex-wrap">
                    <span className="text-forest font-medium">{c.label}:</span>
                    {c.message}
                    <span className="text-charcoal/60 text-xs">
                      (max {c.maxDosesPerDay}/day)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-charcoal mb-2">
                Next dose windows
              </h3>
              <ul className="space-y-2">
                {optimizer.nextDoseWindows.map((w) => (
                  <li
                    key={w.substance}
                    className={`rounded-deco border p-3 text-sm ${
                      w.atLimit
                        ? "border-amber-500/60 bg-amber-50/50"
                        : "border-gold/40 bg-cream"
                    }`}
                  >
                    <span className="font-medium text-forest">{w.label}:</span>{" "}
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </section>

      {optimizer?.eventsToday && optimizer.eventsToday.length > 0 && (
        <section className="card-deco max-w-xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-xl font-semibold text-forest">
              Today&apos;s schedule
            </h2>
            <Link href="/calendar" className="text-sm text-gold hover:underline">Calendar</Link>
          </div>
          <ul className="space-y-1 text-sm text-charcoal/80 mb-3">
            {optimizer.eventsToday.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.title}</span>
                <span className="ml-1">{format(new Date(e.start), "h:mm a")}{!e.allDay && ` – ${format(new Date(e.end), "h:mm a")}`}</span>
              </li>
            ))}
          </ul>
          {optimizer.nextEventToday && optimizer.doseForPeakAtNextEvent && optimizer.doseForPeakAtNextEvent.length > 0 && (
            <div className="rounded-deco border border-gold/60 bg-cream p-3">
              <h3 className="font-medium text-charcoal mb-1">For your next event: {optimizer.nextEventToday.title}</h3>
              <p className="text-charcoal/70 text-xs mb-2">
                {format(new Date(optimizer.nextEventToday.start), "h:mm a")} – {format(new Date(optimizer.nextEventToday.end), "h:mm a")}
              </p>
              <ul className="space-y-0.5 text-sm">
                {optimizer.doseForPeakAtNextEvent.map((d) => (
                  <li key={d.substance} className={d.afterCutoff ? "text-amber-700" : "text-charcoal/80"}>
                    {d.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="card-deco max-w-xl">
        <h2 className="font-serif text-xl font-semibold text-forest mb-4">
          Recent logs
        </h2>
        {loadingLogs ? (
          <p className="text-charcoal/60">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-charcoal/60">No logs yet. Log a dose above.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-baseline gap-2 text-sm border-b border-gold/30 pb-2 last:border-0"
              >
                <span className="font-medium text-forest">{log.substance}</span>
                {log.amount && (
                  <span className="text-charcoal/80">{log.amount}</span>
                )}
                <span className="text-charcoal/70">
                  {format(new Date(log.loggedAt), "MMM d, h:mm a")}
                </span>
                {log.notes && (
                  <span className="text-charcoal/60 italic">{log.notes}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
