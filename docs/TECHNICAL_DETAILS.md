# Vigil Technical Details

This document contains implementation details that are intentionally kept out of the top-level README.

## High-Level Architecture

- **UI pages:** `app/.../page.tsx`
- **APIs:** `app/api/**/route.ts`
- **Business logic:** `lib/*.ts`
- **Database schema:** `prisma/schema.prisma`
- **Global route protection:** `middleware.ts`

Primary feature pages:

- `app/page.tsx` (landing)
- `app/dashboard/page.tsx`
- `app/calendar/page.tsx`
- `app/todos/page.tsx`
- `app/stimulant/page.tsx`
- `app/account/page.tsx`
- `app/auth/login/page.tsx`
- `app/auth/signup/page.tsx`
- `app/auth/verify-email/page.tsx`

## Data Model (Prisma)

Key entities:

- `User` (root)
- `Task`
- `CalendarEvent`
- `StimulantLog`
- `UserHealthProfile`
- `GoogleCalendarToken`
- `AsanaToken`
- `VerificationToken`
- `Drink` + `DrinkSize`

Design notes:

- User content is scoped by `userId`.
- Cascade deletes remove dependent user data on account deletion.
- Drink catalog supports caffeine logging by beverage and size.

## Optimizer Logic

The stimulant optimizer combines:

1. **Pharmacokinetic estimates**
   - Substance-specific half-life assumptions.
   - Active concentration curves over time.

2. **Personalization**
   - Health profile adjustments to half-life and limits.

3. **Interaction adjustments**
   - Substance-substance and medication-substance alerts.
   - Automatic recommendation/limit adjustments.

4. **Tolerance model**
   - Rolling usage window with tolerance level messaging.

5. **Sleep-readiness**
   - Estimates when active levels drop below sleep-safe thresholds.
   - Suppresses certain recommendations during protected sleep window.

## API Surface (Major Endpoints)

Authentication:

- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/login-check/route.ts`
- `app/api/auth/verify-email/route.ts`
- `app/api/auth/resend-verification/route.ts`

User data:

- `app/api/dashboard/route.ts`
- `app/api/events/route.ts`
- `app/api/events/[id]/route.ts`
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`
- `app/api/stimulant/route.ts`
- `app/api/stimulant/optimizer/route.ts`
- `app/api/stimulant/analytics/route.ts`
- `app/api/health-profile/route.ts`

Integrations:

- `app/api/auth/google/route.ts`
- `app/api/auth/google/callback/route.ts`
- `app/api/calendar/google/status/route.ts`
- `app/api/calendar/google/events/route.ts`
- `app/api/calendar/google/disconnect/route.ts`
- `app/api/asana/connect/route.ts`
- `app/api/asana/tasks/route.ts`
- `app/api/asana/complete/route.ts`
- `app/api/asana/disconnect/route.ts`

Account/admin:

- `app/api/account/delete/route.ts`
- `app/api/admin/wipe-users/route.ts` (guarded by env vars)

