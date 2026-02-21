"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { getCachedRouteData, setCachedRouteData } from "@/lib/route-prefetch";
import { ScrollReveal } from "@/components/ScrollReveal";

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

type Substance = "CAFFEINE" | "ADDERALL" | "DEXEDRINE" | "NICOTINE";

type InteractionAlert = {
  id: string;
  severity: "info" | "caution" | "warning" | "danger";
  title: string;
  description: string;
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
  sleepReadiness?: { readyAt: string | null; message: string };
  currentLevels?: Partial<Record<Substance, number>>;
  interactions?: InteractionAlert[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sleepBy, setSleepBy] = useState("22:00");
  const [mode, setMode] = useState<"health" | "productivity">("health");
  const [enabledSubstances, setEnabledSubstances] = useState<Substance[]>([
    "CAFFEINE",
  ]);

  useEffect(() => {
    const savedSleep = localStorage.getItem("vigil_sleepBy");
    const savedMode = localStorage.getItem("vigil_mode");
    const savedSubstances = localStorage.getItem("vigil_enabledSubstances");
    if (savedSleep) setSleepBy(savedSleep);
    if (savedMode === "health" || savedMode === "productivity") setMode(savedMode);
    if (savedSubstances) {
      try {
        const parsed = JSON.parse(savedSubstances) as Substance[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnabledSubstances(parsed);
        }
      } catch {
        // Ignore malformed localStorage value and keep default.
      }
    }
  }, []);

  const enabledSubstanceSet = new Set(enabledSubstances);
  const filteredCutoffs = data?.cutoffs.filter((c) =>
    enabledSubstanceSet.has(c.substance as Substance),
  ) ?? [];
  const filteredNextDoseWindows = data?.nextDoseWindows.filter((w) =>
    enabledSubstanceSet.has(w.substance as Substance),
  ) ?? [];
  const filteredDoseForPeak = data?.doseForPeakAtNextEvent.filter((d) =>
    enabledSubstanceSet.has(d.substance as Substance),
  ) ?? [];

  const handleSleepByChange = (value: string) => {
    setSleepBy(value);
    localStorage.setItem("vigil_sleepBy", value);
  };
  const handleModeChange = (value: "health" | "productivity") => {
    setMode(value);
    localStorage.setItem("vigil_mode", value);
  };

  const isInitialLoad = useRef(true);
  const fetchDashboard = useCallback(async () => {
    if (isInitialLoad.current) {
      setLoading(true);
      isInitialLoad.current = false;
    }
    try {
      setError(null);
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const params = new URLSearchParams({
        sleepBy,
        mode,
        localDate,
        dayStart: dayStart.toISOString(),
        dayEnd: dayEnd.toISOString(),
      });
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; code?: string; detail?: string };
        if (body?.code === "DATABASE_UNAVAILABLE") {
          throw new Error("Database unavailable — check DATABASE_URL and that the database is running.");
        }
        if (body?.detail) throw new Error(body.detail);
        throw new Error(body?.error ?? "Failed to load dashboard");
      }
      const json = await res.json();
      setData(json);
      setCachedRouteData("/dashboard", json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [sleepBy, mode]);

  useEffect(() => {
    const cached = getCachedRouteData("/dashboard") as DashboardData | null;
    if (cached && Array.isArray(cached.events) && Array.isArray(cached.tasks)) {
      setData(cached);
      setLoading(false);
      isInitialLoad.current = false;
    }
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="container py-8 sm:py-12 space-y-8">
      <ScrollReveal animation="fade-up">
        <section className="text-center py-4">
          <h1 className="font-display text-4xl md:text-5xl font-medium text-obsidian tracking-tight mb-2">
            Dashboard
          </h1>
          <p className="text-charcoal text-lg max-w-xl mx-auto">
            Your day, tasks, and stimulant timing in one place.
          </p>
        </section>
      </ScrollReveal>

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
          <ScrollReveal animation="fade-up" delay={100} className="md:col-span-1">
          <section className="card-deco h-full">
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
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200} className="md:col-span-1">
          <section className="card-deco h-full">
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
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={300} className="md:col-span-1">
          <section className="card-deco h-full">
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
              {/* Current active levels */}
              {data.currentLevels && Object.keys(data.currentLevels).length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {(Object.entries(data.currentLevels) as [Substance, number][])
                    .filter(([s]) => enabledSubstanceSet.has(s))
                    .map(([s, mg]) => (
                      <span key={s} className="text-charcoal">
                        {s === "CAFFEINE" ? "Caffeine" : s === "ADDERALL" ? "Adderall" : s === "DEXEDRINE" ? "Dexedrine" : "Nicotine"}:{" "}
                        <span className="font-medium">~{Math.round(mg)}mg</span> active
                      </span>
                    ))}
                </div>
              )}

              {/* Sleep readiness */}
              {data.sleepReadiness && (
                <p className="text-xs text-charcoal">
                  {data.sleepReadiness.readyAt ? `\u{1F4A4} ${data.sleepReadiness.message}` : `\u2705 ${data.sleepReadiness.message}`}
                </p>
              )}

              {/* Interaction alerts */}
              {data.interactions && data.interactions.length > 0 && (
                <div className="space-y-1">
                  {data.interactions.slice(0, 2).map((ix) => (
                    <div key={ix.id} className={`rounded px-2 py-1.5 text-xs ${
                      ix.severity === "danger" ? "bg-red-50 text-red-800 border border-red-300" :
                      ix.severity === "warning" ? "bg-amber-50 text-amber-800 border border-amber-300" :
                      "bg-yellow-50 text-yellow-800 border border-yellow-300"
                    }`}>
                      <span className="font-medium">{ix.title}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-graphite">
                Sleep by {sleepBy}
              </p>
              <div>
                <span className="font-medium text-charcoal">Next dose:</span>
                <ul className="mt-0.5 space-y-0.5">
                  {filteredNextDoseWindows.map((w) => (
                    <li
                      key={w.substance}
                      className={w.atLimit ? "text-amber-700" : "text-graphite"}
                    >
                      {w.label}: {w.message.slice(0, 60)}
                      {w.message.length > 60 ? "\u2026" : ""}
                    </li>
                  ))}
                  {filteredNextDoseWindows.length === 0 && (
                    <li className="text-graphite">No selected stimulant recommendations.</li>
                  )}
                </ul>
              </div>
            </div>
          </section>
          </ScrollReveal>

          {data.nextEventToday && filteredDoseForPeak.length > 0 && (
            <ScrollReveal animation="fade-up" delay={400} className="md:col-span-2 lg:col-span-3">
            <section className="card-deco border-sage/40">
              <h2 className="font-display text-lg font-medium text-sage mb-2">
                {data.nextEventToday.title}
              </h2>
              <p className="text-graphite text-sm mb-2">
                {format(new Date(data.nextEventToday.start), "h:mm a")} –{" "}
                {format(new Date(data.nextEventToday.end), "h:mm a")}
              </p>
              <ul className="space-y-1 text-sm">
                {filteredDoseForPeak.map((d) => (
                  <li
                    key={d.substance}
                    className={d.afterCutoff ? "text-amber-700" : "text-graphite"}
                  >
                    {d.message}
                  </li>
                ))}
              </ul>
            </section>
            </ScrollReveal>
          )}
        </div>
      ) : null}

      {data && (
        <ScrollReveal animation="fade-up" delay={200}>
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
        </ScrollReveal>
      )}

      <ScrollReveal animation="fade-up" delay={300}>
      <section className="flex flex-wrap gap-4 justify-center pt-4">
        <Link href="/calendar" className="btn-deco">
          Calendar
        </Link>
        <Link href="/todos" className="btn-deco">
          To-dos
        </Link>
        <Link href="/stimulant" className="btn-deco-primary">
          Stimulants
        </Link>
      </section>
      </ScrollReveal>
    </div>
  );
}
