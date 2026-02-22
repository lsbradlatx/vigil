"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

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
    title: "Stimulants",
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
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section className="bg-[var(--color-cream)] py-20 md:py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <ScrollReveal animation="fade-up">
            <h1 className="font-display text-5xl md:text-6xl font-semibold text-obsidian tracking-tight leading-tight mb-6">
              Stay sharp. Stay scheduled.
              <br />
              Stay in control.
            </h1>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-charcoal text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Vigil is a scheduling, productivity, and stimulant timing app that helps you
              optimize your day — from your first cup of coffee to your last task before bed.
            </p>
          </ScrollReveal>
          <ScrollReveal animation="scale-in" delay={400}>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/dashboard" className="btn-deco-primary text-base px-8 py-3">
                Get Started
              </Link>
              <a href="#features" className="btn-deco text-base px-8 py-3">
                See Features
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-[var(--color-linen)] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal animation="slide-left">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-medium text-obsidian tracking-tight mb-3">
                Everything you need to own your day
              </h2>
              <p className="text-graphite text-base md:text-lg">
                Three tools that work together so you can focus on what matters.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <ScrollReveal key={f.href} animation="fade-up" delay={(i + 1) * 100 as 100 | 200 | 300}>
                <Link
                  href={f.href}
                  className="card-deco flex flex-col gap-3 group h-full"
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
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-[var(--color-cream)] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal animation="fade-up">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-medium text-obsidian tracking-tight mb-3">
                How it works
              </h2>
              <p className="text-graphite text-base md:text-lg">
                From scattered habits to deliberate routine — in three steps.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <ScrollReveal
                key={s.number}
                animation={i % 2 === 0 ? "slide-left" : "slide-right"}
                delay={(i + 1) * 100 as 100 | 200 | 300}
              >
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-sage-light)] bg-opacity-40">
                    <span className="font-display text-2xl font-light text-sage">
                      {s.number}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-medium text-obsidian">
                    {s.title}
                  </h3>
                  <p className="text-graphite text-sm leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="bg-[var(--color-bg-dark)] py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <ScrollReveal animation="fade-in">
            <h2 className="font-display text-2xl md:text-3xl font-medium text-[var(--color-text-on-dark)] mb-4">
              Connects to your workflow
            </h2>
            <p className="text-[var(--color-text-on-dark)] opacity-80 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
              Pull in events from{" "}
              <span className="font-medium text-sage">Google Calendar</span>{" "}
              and tasks from{" "}
              <span className="font-medium text-sage">Asana</span>{" "}
              — or use Vigil on its own. Everything syncs automatically once connected.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-[var(--color-sage-light)] bg-opacity-20 py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <ScrollReveal animation="fade-up">
            <h2 className="font-display text-3xl md:text-4xl font-medium text-obsidian tracking-tight mb-6">
              Ready to take control of your day?
            </h2>
            <Link href="/dashboard" className="btn-deco-primary text-base px-10 py-3 inline-block">
              Open Dashboard
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
