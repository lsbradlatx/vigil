import Link from "next/link";

const features = [
  {
    title: "Calendar",
    tagline: "Events at a glance",
    description:
      "Manage your schedule, connect Google Calendar, and see your entire day laid out. Create events, set reminders, and never miss what matters.",
    href: "/calendar",
  },
  {
    title: "To-dos",
    tagline: "Tasks that stick",
    description:
      "Keep track of everything you need to do with due dates, completion tracking, and Asana integration. Local and synced tasks in one list.",
    href: "/todos",
  },
  {
    title: "Stimulant Optimizer",
    tagline: "Timing is everything",
    description:
      "Log caffeine, Adderall, and nicotine. Get science-backed cutoff times, dose-for-peak suggestions before events, and daily limits — in health or productivity mode.",
    href: "/stimulant",
  },
];

const steps = [
  {
    number: "01",
    title: "Set your sleep target",
    description:
      "Pick your bedtime and choose between health mode (stricter limits, longer spacing) or productivity mode (more flexible, still within safe bounds).",
  },
  {
    number: "02",
    title: "Log your day",
    description:
      "Add calendar events, check off tasks, and log each dose as you go. Vigil tracks everything so you don't have to remember.",
  },
  {
    number: "03",
    title: "Get smart timing",
    description:
      "Vigil tells you when to dose for peak effect before your next event, when to stop so you can sleep, and how much you have left for the day.",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="text-center py-12 md:py-20 max-w-3xl mx-auto">
        <h1 className="font-display text-5xl md:text-6xl font-semibold text-obsidian tracking-tight leading-tight mb-6">
          Stay sharp. Stay scheduled.
          <br />
          Stay in control.
        </h1>
        <p className="text-charcoal text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Vigil is a scheduling, productivity, and stimulant timing app that helps you
          optimize your day — from your first cup of coffee to your last task before bed.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/dashboard" className="btn-deco-primary text-base px-8 py-3">
            Get Started
          </Link>
          <a href="#features" className="btn-deco text-base px-8 py-3">
            See Features
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-medium text-obsidian tracking-tight mb-3">
            Everything you need to own your day
          </h2>
          <p className="text-graphite text-base md:text-lg">
            Three tools that work together so you can focus on what matters.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="card-deco flex flex-col gap-3 group"
            >
              <p className="text-sage text-sm font-medium uppercase tracking-widest">
                {f.tagline}
              </p>
              <h3 className="font-display text-2xl font-medium text-obsidian group-hover:text-sage transition-colors">
                {f.title}
              </h3>
              <p className="text-graphite text-sm leading-relaxed">
                {f.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-medium text-obsidian tracking-tight mb-3">
            How it works
          </h2>
          <p className="text-graphite text-base md:text-lg">
            From scattered habits to deliberate routine — in three steps.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {steps.map((s) => (
            <div key={s.number} className="space-y-3">
              <span className="font-display text-4xl font-light text-sage/60">
                {s.number}
              </span>
              <h3 className="font-display text-xl font-medium text-obsidian">
                {s.title}
              </h3>
              <p className="text-graphite text-sm leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="card-deco max-w-3xl mx-auto text-center py-8 space-y-4">
        <h2 className="font-display text-2xl font-medium text-obsidian">
          Connects to your workflow
        </h2>
        <p className="text-graphite text-sm max-w-lg mx-auto leading-relaxed">
          Pull in events from <span className="font-medium text-charcoal">Google Calendar</span> and
          tasks from <span className="font-medium text-charcoal">Asana</span> — or use
          Vigil on its own. Everything syncs automatically once connected.
        </p>
      </section>

      {/* Bottom CTA */}
      <section className="text-center py-12 space-y-6">
        <h2 className="font-display text-3xl md:text-4xl font-medium text-obsidian tracking-tight">
          Ready to take control of your day?
        </h2>
        <Link href="/dashboard" className="btn-deco-primary text-base px-10 py-3 inline-block">
          Open Dashboard
        </Link>
      </section>
    </div>
  );
}
