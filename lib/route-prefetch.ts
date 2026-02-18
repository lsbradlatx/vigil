/**
 * Client-side cache for prefetched route data. Used by Nav (prefetch on hover/focus)
 * and by each page (read cache on mount, fall back to fetch if miss).
 */

const cache = new Map<string, { data: unknown; at: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute; stale data still used for instant paint, then revalidate

export function getCachedRouteData(href: string): unknown | null {
  const entry = cache.get(href);
  if (!entry) return null;
  return entry.data;
}

export function setCachedRouteData(href: string, data: unknown): void {
  cache.set(href, { data, at: Date.now() });
}

export function isCacheStale(href: string): boolean {
  const entry = cache.get(href);
  if (!entry) return true;
  return Date.now() - entry.at > CACHE_TTL_MS;
}

/** Prefetch data for a route so it's ready when the user navigates. */
export function prefetchRouteData(href: string): void {
  if (typeof window === "undefined") return;
  const path = href.split("?")[0];
  if (path === "/") {
    const sleepBy = localStorage.getItem("stoicsips_sleepBy") ?? "22:00";
    const mode = localStorage.getItem("stoicsips_mode") ?? "health";
    const params = new URLSearchParams({ sleepBy, mode });
    fetch(`/api/dashboard?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data != null && setCachedRouteData("/", data))
      .catch(() => {});
    return;
  }
  if (path === "/stimulant") {
    const sleepBy = localStorage.getItem("stoicsips_sleepBy") ?? "22:00";
    const mode = localStorage.getItem("stoicsips_mode") ?? "health";
    const today = new Date().toISOString().slice(0, 10);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const logsUrl = `/api/stimulant?start=${twoDaysAgo.toISOString()}&limit=200`;
    const params = new URLSearchParams({ sleepBy, mode, date: today });
    const optimizerUrl = `/api/stimulant/optimizer?${params}`;
    Promise.all([
      fetch("/api/health-profile").then((r) => (r.ok ? r.json() : null)),
      fetch(logsUrl).then((r) => (r.ok ? r.json() : [])),
      fetch(optimizerUrl).then((r) => (r.ok ? r.json() : null)),
    ]).then(([healthProfile, logs, optimizer]) => {
      setCachedRouteData("/stimulant", { healthProfile, logs, optimizer });
    }).catch(() => {});
    return;
  }
  if (path === "/calendar") {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const eventsUrl = `/api/events?start=${start.toISOString()}&end=${end.toISOString()}`;
    const googleEventsUrl = `/api/calendar/google/events?start=${start.toISOString()}&end=${end.toISOString()}`;
    Promise.all([
      fetch("/api/calendar/google/status").then((r) => (r.ok ? r.json() : { connected: false })),
      fetch(eventsUrl).then((r) => (r.ok ? r.json() : [])),
      fetch(googleEventsUrl).then((r) => (r.ok ? r.json() : [])),
    ]).then(([status, localEvents, googleEvents]) => {
      setCachedRouteData("/calendar", {
        googleConnected: status?.connected ?? false,
        localEvents: localEvents ?? [],
        googleEvents: googleEvents ?? [],
      });
    }).catch(() => {});
    return;
  }
  if (path === "/todos") {
    const dateStr = new Date().toISOString().slice(0, 10);
    Promise.all([
      fetch("/api/asana/status").then((r) => (r.ok ? r.json() : { connected: false })),
      fetch("/api/tasks").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/asana/tasks").then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/events?date=${dateStr}`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([asanaStatus, localTasks, asanaTasks, todayEvents]) => {
      const tasks = [
        ...(localTasks ?? []).map((t: { id: string; title: string; completed: boolean; dueDate: string | null; order?: number }) => ({ ...t, source: undefined })),
        ...(asanaTasks ?? []).map((t: { id: string; title: string; completed: boolean; dueDate: string | null; order?: number }) => ({ ...t, source: "asana" as const })),
      ];
      setCachedRouteData("/todos", {
        asanaConnected: asanaStatus?.connected ?? false,
        tasks,
        todayEvents: todayEvents ?? [],
      });
    }).catch(() => {});
    return;
  }
}
