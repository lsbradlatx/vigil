# Vigil

A scheduling, productivity, and focus app that helps optimize stimulant usage (caffeine, Adderall, nicotine) with a cozy Art Deco aesthetic.

## Setup

1. Install dependencies: `npm install`
2. Set up the database: `npx prisma generate && npx prisma db push`
3. Run the dev server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Features

- **Calendar** — View and manage events
- **To-dos** — Task list with due dates
- **Stimulant Optimizer** — Log doses and get suggested optimal times and cutoff times for sleep

## Docs

- [Health profile and future integrations](docs/HEALTH_INTEGRATION.md) — manual health profile, personalization, and placeholder for third-party health APIs.

## Tech

- Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma, SQLite
