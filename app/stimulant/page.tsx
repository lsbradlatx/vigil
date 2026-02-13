"use client";

import { useCallback, useEffect, useState } from "react";
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
};

type NextDoseWindow = {
  substance: Substance;
  label: string;
  windowStart: string;
  windowEnd: string;
  message: string;
};

type OptimizerResponse = {
  now: string;
  sleepBy: string;
  cutoffs: CutoffResult[];
  nextDoseWindows: NextDoseWindow[];
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
      const params = new URLSearchParams({ sleepBy });
      const res = await fetch(`/api/stimulant/optimizer?${params}`);
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data = await res.json();
      setOptimizer(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoadingOptimizer(false);
    }
  }, [sleepBy]);

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
        For awareness only; not medical advice. Use this to see suggested cutoff times for sleep and when it may be okay to take your next dose based on typical half-lives.
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
            <div>
              <h3 className="font-medium text-charcoal mb-2">Cutoff times</h3>
              <ul className="space-y-1 text-charcoal/80">
                {optimizer.cutoffs.map((c) => (
                  <li key={c.substance} className="flex items-center gap-2">
                    <span className="text-forest font-medium">{c.label}:</span>
                    {c.message}
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
                    className="rounded-deco border border-gold/40 bg-cream p-3 text-sm"
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
