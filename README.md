# Vigil

Vigil is a full-stack productivity app that unifies calendar planning, task management, and stimulant timing guidance in one interface.

It is built with Next.js (App Router), TypeScript, Prisma, and PostgreSQL, with account-based data ownership, email verification, and optional Google Calendar/Asana integrations.

## Live Demo

https://www.vigiltracker.net

## Features

- Account system with email verification and protected routes
- Dashboard combining events, tasks, and stimulant guidance
- Calendar with local event CRUD and Google Calendar sync
- To-do management with optional Asana sync
- Stimulant Optimizer with logging, recommendations, interactions, tolerance, and sleep-readiness estimates
- Light/dark theme support and responsive UI

## Tech Stack

- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- NextAuth v5 beta (credentials + JWT sessions)
- Prisma ORM + PostgreSQL
- Resend (email), Google APIs, Asana API
- `date-fns` and custom SVG charting

## Local Setup

### Prerequisites

- Node.js + npm
- PostgreSQL database

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and fill required values.

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item ".env.example" ".env"
```

### 3) Initialize database

```bash
npm run db:generate
npm run db:push
```

Optional seed (recommended for drink catalog):

```bash
npm run db:seed
```

### 4) Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Required for core app:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Optional/integration variables:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `WIPE_SECRET`
- `ALLOW_WIPE_USERS` (required to enable admin wipe route)

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint checks
- `npm run db:generate` - Prisma client generation
- `npm run db:migrate` - migration workflow
- `npm run db:push` - schema push workflow (current primary)
- `npm run db:seed` - seed drink catalog

## Project Structure

- `app/` - pages, layouts, and API route handlers
- `components/` - UI components
- `lib/` - domain/business logic and integrations
- `prisma/` - schema and seed data
- `docs/` - supplementary documentation

## Deployment

- See `DEPLOY_TO_PRODUCTION.md` for full Railway deployment steps.

## Limitations and Safety

- This is not a medical diagnostic or prescribing tool.
- Recommendations are heuristic and model-based, not individualized clinical guidance.
- External APIs (Google, Asana, email provider) require valid credentials and may fail independently.

## Documentation

- `docs/HEALTH_INTEGRATION.md` - health profile and integration notes
- `docs/TECHNICAL_DETAILS.md` - detailed architecture, API surface, data model, and optimizer internals
- `DEPLOY_TO_PRODUCTION.md` - deployment/runbook
