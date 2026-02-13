"use client";

import { useEffect, useState } from "react";
import { format, isPast } from "date-fns";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  order: number;
  createdAt: string;
};

export default function TodosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      <div className="card-deco max-w-2xl mx-auto text-center py-8 text-charcoal/70">
        Loading tasks…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-serif text-3xl font-semibold text-charcoal">To-dos</h1>

      {error && (
        <div className="rounded-deco border border-red-300 bg-red-50 text-red-800 px-4 py-2 text-sm">
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
          <li className="card-deco text-charcoal/60 text-center py-6">
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
                  className="h-4 w-4 rounded border-gold text-gold focus:ring-gold"
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={
                      task.completed
                        ? "text-charcoal/60 line-through"
                        : "text-charcoal"
                    }
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span
                      className={`ml-2 text-sm ${
                        overdue ? "text-red-600" : "text-charcoal/60"
                      }`}
                    >
                      Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="text-charcoal/50 hover:text-red-600 text-sm px-2 py-1 rounded"
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
