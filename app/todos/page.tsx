"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, isPast } from "date-fns";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  order: number;
  createdAt: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
};

export default function TodosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTodayEvents = useCallback(async () => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    try {
      const res = await fetch(`/api/events?date=${dateStr}`);
      if (!res.ok) return;
      const data = await res.json();
      setTodayEvents(data);
    } catch {
      setTodayEvents([]);
    }
  }, []);

  const fetchTasks = async () => {
    try {
      setError(null);
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    fetchTodayEvents();
  }, [fetchTodayEvents]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add task");
      const task = await res.json();
      setTasks((prev) => [...prev, task]);
      setNewTitle("");
      setNewDueDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      if (!res.ok) throw new Error("Update failed");
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="card-deco max-w-2xl mx-auto text-center py-8 text-graphite">
        Loading tasks…
      </div>
    );
  }

  const tasksDueToday = tasks.filter((t) => t.dueDate && format(new Date(t.dueDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && !t.completed);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-light text-obsidian">To-dos</h1>

      {todayEvents.length > 0 && (
        <section className="card-deco">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-light text-sage">Today&apos;s schedule</h2>
            <Link href="/calendar" className="text-sm text-sage hover:underline">Calendar</Link>
          </div>
          <ul className="space-y-1 text-sm">
            {todayEvents.map((e) => (
              <li key={e.id} className="text-graphite">
                <span className="font-medium">{e.title}</span>
                <span className="ml-1">{format(new Date(e.start), "h:mm a")}{!e.allDay && ` – ${format(new Date(e.end), "h:mm a")}`}</span>
              </li>
            ))}
          </ul>
          {tasksDueToday.length > 0 && (
            <p className="text-graphite text-xs mt-2">
              You have {tasksDueToday.length} task{tasksDueToday.length === 1 ? "" : "s"} due today. Time stimulants with your schedule on the <Link href="/" className="text-sage hover:underline">dashboard</Link> or <Link href="/stimulant" className="text-sage hover:underline">Stimulant Optimizer</Link>.
            </p>
          )}
        </section>
      )}

      {error && (
        <div className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-linen)] text-obsidian px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task…"
          className="input-deco flex-1 min-w-0"
          disabled={submitting}
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="input-deco w-full sm:w-auto"
          disabled={submitting}
        />
        <button type="submit" className="btn-deco-primary whitespace-nowrap" disabled={submitting}>
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {tasks.length === 0 ? (
          <li className="card-deco text-graphite text-center py-6">
            No tasks yet. Add one above.
          </li>
        ) : (
          tasks.map((task) => {
            const overdue = task.dueDate && isPast(new Date(task.dueDate)) && !task.completed;
            return (
              <li
                key={task.id}
                className={`card-deco flex items-center gap-3 ${
                  task.completed ? "opacity-70" : ""
                } ${overdue ? "border-red-400/50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleComplete(task.id, task.completed)}
                  className="h-4 w-4 rounded border-sage text-sage focus:ring-sage"
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={
                      task.completed
                        ? "text-graphite line-through"
                        : "text-charcoal"
                    }
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span
                      className={`ml-2 text-sm ${
                        overdue ? "text-red-600" : "text-graphite"
                      }`}
                    >
                      Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="text-graphite hover:text-red-600 text-sm px-2 py-1 rounded"
                  aria-label="Delete"
                >
                  Delete
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
