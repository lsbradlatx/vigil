# Health profile and future integrations

## Current: manual health profile

The app uses a **manual health profile** only. Users can enter optional data on the Stimulant Optimizer page:

- **Weight (kg)** – used to cap daily caffeine (e.g. ~5.5 mg/kg, max 400 mg).
- **Height (cm)** – stored for future use.
- **Allergies** – free text; matched against substance keywords to show “Not recommended: listed allergy” and skip that substance in recommendations.
- **Medications** – free text; a warning is shown (“Discuss stimulant use with your doctor”) but limits are not auto-adjusted.

Data is stored in the `UserHealthProfile` table (single row per app instance). The optimizer API loads this profile and passes it into the stimulant calculator so recommendations are personalized. All of this is for awareness only; the app does not provide medical advice and limits are not adjusted for prescription use.

## Google and health data

**Google does not provide a web API** for personal health data suitable for this app:

- **Health Connect** is Android-only and not available from a typical web/Next.js backend.
- **Google Fit** (REST) has been deprecated.

So we do not integrate Google for height, weight, or conditions.

## Future option: third-party health aggregator

A possible future enhancement is to integrate a **web-based health data aggregator** that can supply height, weight, conditions, or allergies. Examples (for research only; not an endorsement):

- **Human API** – health data aggregation with OAuth and a connect widget.
- Other providers that expose a web API and OAuth or similar for user consent.

### Integration outline

1. **Environment** – Add env vars for the provider (e.g. `HEALTH_API_KEY`, `HEALTH_API_SECRET`, callback URL).
2. **Connect flow** – Implement OAuth (or provider’s connect widget) so the user can link their health account.
3. **Mapping** – Map the provider’s fields to our profile: e.g. weight → `weightKg`, height → `heightCm`, conditions/allergies → `allergies` (and optionally `medications`). Normalize into the same shape as the manual `UserHealthProfile`.
4. **Storage** – Either pre-fill or sync with the in-app `UserHealthProfile` (or a separate “connected” profile row), then reuse the existing personalization logic in `lib/health-profile.ts` and `lib/stimulant-calculator.ts`.
5. **Code placeholder** – In `lib/health-profile.ts`, a commented stub `fetchFromExternalHealthProvider()` marks where a future implementation would live; the rest of the flow can stay unchanged.

This document will be updated if we add such an integration.
