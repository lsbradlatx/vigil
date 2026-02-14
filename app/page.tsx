"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
};

type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  order: number;
};

type Cutoff = {
  substance: string;
  label: string;
  message: string;
  maxDosesPerDay: number;
};

type NextDoseWindow = {
  substance: string;
  label: string;
  message: string;
  atLimit?: boolean;
};

type DoseForPeak = {
  substance: string;
  label: string;
  takeByFormatted: string;
  message: string;
  afterCutoff?: boolean;
};

type DashboardData = {
  date: string;
  mode: string;
  events: CalendarEvent[];
  tasks: Task[];
  cutoffs: Cutoff[];
  nextDoseWindows: NextDoseWindow[];
  nextEventToday: { id: string; title: string; start: string; end: string } | null;
  doseForPeakAtNextEvent: DoseForPeak[];
};

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sleepBy, setSleepBy] = useState("22:00");
  const [mode, setMode] = useState<"health" | "productivity">("health");

  useEffect(() => {
    const savedSleep = localStorage.getItem("stoicsips_sleepBy");
    const savedMode = localStorage.getItem("stoicsips_mode");
    if (savedSleep) setSleepBy(savedSleep);
    if (savedMode === "health" || savedMode === "productivity") setMode(savedMode);
  }, []);

  const handleSleepByChange = (value: string) => {
    setSleepBy(value);
    localStorage.setItem("stoicsips_sleepBy", value);
  };
  const handleModeChange = (value: "health" | "productivity") => {
    setMode(value);
    localStorage.setItem("stoicsips_mode", value);
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const params = new URLSearchParams({
        sleepBy,
        mode,
      });
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [sleepBy, mode]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="space-y-8">
      <section className="text-center py-4">
        <h1 className="font-display text-4xl md:text-5xl font-medium text-obsidian tracking-tight mb-2">
          StoicSips
        </h1>
        <p className="text-charcoal text-lg max-w-xl mx-auto">
          Your day, tasks, and stimulant timing in one place.
        </p>
      </section>

      {error && (
        <div className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-linen)] text-obsidian px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card-deco max-w-3xl mx-auto text-center py-12 text-graphite">
          Loading your day…
        </div>
      ) : data != null ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {/* Today's events */}
          <section className="card-deco md:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-medium text-sage">
                Today&apos;s schedule
              </h2>
              <Link
                href="/calendar"
                className="text-sm text-sage hover:underline"
              >
                Calendar
              </Link>
            </div>
            {data.events.length === 0 ? (
              <p className="text-graphite text-sm">No events today.</p>
            ) : (
              <ul className="space-y-2">
                {data.events.map((e) => (
                  <li
                    key={e.id}
                    className="text-sm border-l-2 border-sage/50 pl-2 py-0.5"
                  >
                    <span className="font-medium text-charcoal">{e.title}</span>
                    <span className="text-graphite ml-1">
                      {format(new Date(e.start), "h:mm a")}
                      {!e.allDay && ` – ${format(new Date(e.end), "h:mm a")}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Today's tasks */}
          <section className="card-deco md:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-medium text-sage">
                Tasks due today
              </h2>
              <Link href="/todos" className="text-sm text-sage hover:underline">
                To-dos
              </Link>
            </div>
            {data.tasks.length === 0 ? (
              <p className="text-graphite text-sm">No tasks due today.</p>
            ) : (
              <ul className="space-y-1">
                {data.tasks
                  .filter((t) => !t.completed)
                  .map((t) => (
                    <li key={t.id} className="text-sm text-charcoal flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border border-charcoal/50" />
                      {t.title}
                    </li>
                  ))}
                {data.tasks.filter((t) => t.completed).length > 0 && (
                  <li className="text-graphite text-xs mt-1">
                    {data.tasks.filter((t) => t.completed).length} completed
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* Stimulant summary */}
          <section className="card-deco md:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-medium text-sage">
                Stimulant optimizer
              </h2>
              <Link
                href="/stimulant"
                className="text-sm text-sage hover:underline"
              >
                Optimizer
              </Link>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-graphite">
                Mode: <strong>{data.mode}</strong> · Sleep by {sleepBy}
              </p>
              <div>
                <span className="font-medium text-charcoal">Cutoffs:</span>
                <ul className="mt-0.5 space-y-0.5 text-graphite">
                  {data.cutoffs.slice(0, 3).map((c) => (
                    <li key={c.substance}>{c.message}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-charcoal">Next dose:</span>
                <ul className="mt-0.5 space-y-0.5">
                  {data.nextDoseWindows.map((w) => (
                    <li
                      key={w.substance}
                      className={w.atLimit ? "text-amber-700" : "text-graphite"}
                    >
                      {w.label}: {w.message.slice(0, 50)}
                      {w.message.length > 50 ? "…" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Dose for next event — full width when present */}
          {data.nextEventToday && data.doseForPeakAtNextEvent.length > 0 && (
            <section className="card-deco md:col-span-2 lg:col-span-3 border-sage/40">
              <h2 className="font-display text-lg font-medium text-sage mb-2">
                For your next event: {data.nextEventToday.title}
              </h2>
              <p className="text-graphite text-sm mb-2">
                {format(new Date(data.nextEventToday.start), "h:mm a")} –{" "}
                {format(new Date(data.nextEventToday.end), "h:mm a")}
              </p>
              <ul className="space-y-1 text-sm">
                {data.doseForPeakAtNextEvent.map((d) => (
                  <li
                    key={d.substance}
                    className={d.afterCutoff ? "text-amber-700" : "text-graphite"}
                  >
                    {d.message}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : null}

      {/* Settings strip for dashboard (sleep by + mode) */}
      {data && (
        <section className="card-deco max-w-2xl mx-auto flex flex-wrap items-center gap-4 text-sm">
          <span className="text-graphite">Dashboard settings:</span>
          <label className="flex items-center gap-2">
            Sleep by
            <input
              type="time"
              value={sleepBy}
              onChange={(e) => handleSleepByChange(e.target.value)}
              className="input-deco py-1"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === "health"}
                onChange={() => handleModeChange("health")}
                className="text-sage"
              />
              Health
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === "productivity"}
                onChange={() => handleModeChange("productivity")}
                className="text-sage"
              />
              Productivity
            </label>
          </div>
        </section>
      )}

      <section className="flex flex-wrap gap-4 justify-center pt-4">
        <Link href="/calendar" className="btn-deco">
          Calendar
        </Link>
        <Link href="/todos" className="btn-deco">
          To-dos
        </Link>
        <Link href="/stimulant" className="btn-deco-primary">
          Stimulant Optimizer
        </Link>
      </section>
    </div>
  );
}
