import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

function getRedirectUri(origin?: string) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  return origin ? `${origin}/api/auth/google/callback` : "http://localhost:3000/api/auth/google/callback";
}

export function getAuthUrl(origin?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, getRedirectUri(origin));
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function getTokensFromCode(code: string, origin?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, getRedirectUri(origin));
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) throw new Error("No refresh_token in response");
  return tokens.refresh_token;
}

export async function getCalendarEvents(
  refreshToken: string,
  timeMin: string,
  timeMax: string
): Promise<{ id: string; title: string; start: string; end: string; allDay: boolean; source: "google" }[]> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google Calendar not configured");
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
  });
  const items = res.data.items ?? [];
  return items
    .filter((e) => e.start && (e.start.dateTime || e.start.date))
    .map((e) => {
      const start = e.start!.dateTime ?? e.start!.date!;
      const end = e.end!.dateTime ?? e.end!.date!;
      const allDay = !e.start!.dateTime;
      return {
        id: `google-${e.id}`,
        title: (e.summary ?? "Untitled") as string,
        start: allDay ? `${start}T00:00:00.000Z` : start,
        end: allDay ? `${end}T23:59:59.999Z` : end,
        allDay,
        source: "google" as const,
      };
    });
}
