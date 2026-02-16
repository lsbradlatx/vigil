"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
};

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string | null;
};

type ApiEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string | null;
  source?: "google";
};

function toEvent(e: ApiEvent): CalendarEvent & { resource?: ApiEvent } {
  return {
    id: e.id,
    title: e.title,
    start: new Date(e.start),
    end: new Date(e.end),
    allDay: e.allDay,
    color: e.source === "google" ? "var(--color-slate-blue)" : e.color,
    resource: e,
  };
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasksForViewDate, setTasksForViewDate] = useState<Task[]>([]);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<(CalendarEvent & { resource?: ApiEvent }) | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [googleMessage, setGoogleMessage] = useState<"connected" | "error" | null>(null);
  const searchParams = useSearchParams();

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/google/status");
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.connected);
      }
    } catch {
      setGoogleConnected(false);
    }
  }, []);

  const fetchEvents = useCallback(async (start?: Date, end?: Date) => {
    try {
      setError(null);
      const rangeStart = start ?? startOfMonth(viewDate);
      const rangeEnd = end ?? endOfMonth(viewDate);
      let url = "/api/events";
      url += `?start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`;
      const [localRes, googleRes] = await Promise.all([
        fetch(url),
        fetch(`/api/calendar/google/events?start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`),
      ]);
      if (!localRes.ok) throw new Error("Failed to load events");
      const localData: ApiEvent[] = await localRes.json();
      const googleData: ApiEvent[] = googleRes.ok ? await googleRes.json() : [];
      setEvents([...localData.map(toEvent), ...googleData.map(toEvent)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [viewDate]);

  const fetchTasksForDate = useCallback(async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      const res = await fetch(`/api/tasks?dueDate=${dateStr}`);
      if (!res.ok) return;
      const data = await res.json();
      setTasksForViewDate(data);
    } catch {
      setTasksForViewDate([]);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  useEffect(() => {
    const google = searchParams.get("google");
    const err = searchParams.get("error");
    if (google === "connected") {
      setGoogleMessage("connected");
      setGoogleConnected(true);
      setLoading(true);
      fetchEvents();
      window.history.replaceState({}, "", "/calendar");
    } else if (err?.startsWith("google_")) {
      setGoogleMessage("error");
      window.history.replaceState({}, "", "/calendar");
    }
  }, [searchParams, fetchEvents]);

  useEffect(() => {
    if (googleMessage) {
      const t = setTimeout(() => setGoogleMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [googleMessage]);

  useEffect(() => {
    setLoading(true);
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchTasksForDate(viewDate);
  }, [viewDate, fetchTasksForDate]);

  const handleSelectSlot = useCallback((slot: { start: Date; end: Date }) => {
    setSelectedEvent(null);
    setFormTitle("");
    setFormStart(format(slot.start, "yyyy-MM-dd'T'HH:mm"));
    setFormEnd(format(slot.end, "yyyy-MM-dd'T'HH:mm"));
    setFormAllDay(false);
    setShowForm(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent & { resource?: ApiEvent }) => {
    setSelectedEvent(event);
    setFormTitle(event.title);
    setFormStart(format(event.start, "yyyy-MM-dd'T'HH:mm"));
    setFormEnd(format(event.end, "yyyy-MM-dd'T'HH:mm"));
    setFormAllDay(!!event.allDay);
    setShowForm(true);
  }, []);

  const isGoogleEvent = (event: (CalendarEvent & { resource?: ApiEvent }) | null) =>
    event?.id?.startsWith("google-") ?? false;

  const disconnectGoogle = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/google/disconnect", { method: "POST" });
      if (res.ok) {
        setGoogleConnected(false);
        setLoading(true);
        await fetchEvents();
      }
    } finally {
      setDisconnecting(false);
    }
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGoogleEvent(selectedEvent) || !formTitle.trim() || !formStart || !formEnd || saving) return;
    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        start: new Date(formStart).toISOString(),
        end: new Date(formEnd).toISOString(),
        allDay: formAllDay,
      };
      if (selectedEvent?.id) {
        const res = await fetch(`/api/events/${selectedEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Update failed");
        const updated = await res.json();
        setEvents((prev) =>
          prev.map((ev) => (ev.id === updated.id ? toEvent(updated) : ev))
        );
      } else {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Create failed");
        const created = await res.json();
        setEvents((prev) => [...prev, toEvent(created)]);
      }
      setShowForm(false);
      setSelectedEvent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!selectedEvent?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
      setShowForm(false);
      setSelectedEvent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <div className="card-deco max-w-4xl mx-auto text-center py-12 text-graphite">
        Loading calendar…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-medium text-obsidian">Calendar</h1>
        <div className="flex items-center gap-2">
          {googleConnected ? (
            <button
              type="button"
              onClick={disconnectGoogle}
              disabled={disconnecting}
              className="btn-deco text-sm"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect Google Calendar"}
            </button>
          ) : (
            <a href="/api/auth/google" className="btn-deco-primary text-sm">
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>

      {googleMessage === "connected" && (
        <div className="rounded-md border border-[var(--color-sage)] bg-[var(--color-sage-light)] text-obsidian px-4 py-2 text-sm">
          Google Calendar connected.
        </div>
      )}
      {googleMessage === "error" && (
        <div className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-linen)] text-obsidian px-4 py-2 text-sm">
          Could not connect. Try again.
        </div>
      )}
      {error && (
        <div className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-linen)] text-obsidian px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="card-deco overflow-hidden">
        <div className="rbc-calendar rbc-deco">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ minHeight: 500 }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onNavigate={(date) => setViewDate(date)}
            date={viewDate}
            selectable
          />
        </div>
      </div>

      <section className="card-deco">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-lg font-medium text-sage">
            Tasks due {format(viewDate, "MMMM d, yyyy")}
          </h2>
          <Link href="/todos" className="text-sm text-sage hover:underline">
            To-dos
          </Link>
        </div>
        {tasksForViewDate.length === 0 ? (
          <p className="text-graphite text-sm">No tasks due this day.</p>
        ) : (
          <ul className="space-y-1">
            {tasksForViewDate.map((t) => (
              <li
                key={t.id}
                className={`text-sm flex items-center gap-2 ${t.completed ? "text-graphite line-through" : "text-charcoal"}`}
              >
                <span className={t.completed ? "text-sage" : "text-graphite"}>
                  {t.completed ? "✓" : "○"}
                </span>
                {t.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 bg-obsidian/40 flex items-center justify-center z-20 p-4">
          <div className="card-deco max-w-md w-full shadow-xl">
            <h2 className="font-display text-xl font-medium text-obsidian mb-4">
              {isGoogleEvent(selectedEvent) ? "Google Calendar event" : selectedEvent ? "Edit event" : "New event"}
            </h2>
            <form onSubmit={saveEvent} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="input-deco w-full"
                  required
                  readOnly={isGoogleEvent(selectedEvent)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Start</label>
                <input
                  type="datetime-local"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className="input-deco w-full"
                  disabled={formAllDay || isGoogleEvent(selectedEvent)}
                  readOnly={isGoogleEvent(selectedEvent)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">End</label>
                <input
                  type="datetime-local"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  className="input-deco w-full"
                  disabled={formAllDay || isGoogleEvent(selectedEvent)}
                  readOnly={isGoogleEvent(selectedEvent)}
                />
              </div>
              <label className={`flex items-center gap-2 text-charcoal ${isGoogleEvent(selectedEvent) ? "opacity-70" : ""}`}>
                <input
                  type="checkbox"
                  checked={formAllDay}
                  onChange={(e) => setFormAllDay(e.target.checked)}
                  className="rounded border-sage text-sage"
                  disabled={isGoogleEvent(selectedEvent)}
                />
                All day
              </label>
              <div className="flex gap-2 pt-2">
                {!isGoogleEvent(selectedEvent) && (
                  <button type="submit" className="btn-deco-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                )}
                {selectedEvent && !isGoogleEvent(selectedEvent) && (
                  <button
                    type="button"
                    onClick={deleteEvent}
                    className="btn btn--secondary text-obsidian hover:!bg-obsidian hover:!text-cream"
                    disabled={saving}
                  >
                    Delete
                  </button>
                )}
                <button type="button" onClick={closeForm} className="btn-deco">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
