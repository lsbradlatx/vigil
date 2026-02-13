import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-charcoal mb-2">
          StoicSips
        </h1>
        <p className="text-charcoal/80 text-lg max-w-xl mx-auto">
          Schedule your day, track your tasks, and optimize when you use caffeine, Adderall, or nicotine — so you stay focused without sacrificing sleep.
        </p>
      </section>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Link
          href="/calendar"
          className="card-deco block hover:shadow-gold transition-shadow"
        >
          <h2 className="font-serif text-xl font-semibold text-forest mb-1">Calendar</h2>
          <p className="text-charcoal/80 text-sm">View and manage your events in a simple month view.</p>
        </Link>
        <Link
          href="/todos"
          className="card-deco block hover:shadow-gold transition-shadow"
        >
          <h2 className="font-serif text-xl font-semibold text-forest mb-1">To-dos</h2>
          <p className="text-charcoal/80 text-sm">Keep a task list with due dates and completion tracking.</p>
        </Link>
        <Link
          href="/stimulant"
          className="card-deco block hover:shadow-gold transition-shadow"
        >
          <h2 className="font-serif text-xl font-semibold text-forest mb-1">Stimulant Optimizer</h2>
          <p className="text-charcoal/80 text-sm">Log doses and get optimal times and cutoff suggestions.</p>
        </Link>
      </section>
    </div>
  );
}
