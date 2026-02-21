import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";
import {
  getCutoffTimes,
  getNextDoseWindows,
  getDoseForPeakAt,
  getSleepReadiness,
  countDosesLast24h,
  sumTotalMgLast24h,
  getGovernmentLimits,
  type SubstanceType,
  type OptimizationMode,
} from "@/lib/stimulant-calculator";
import { getConcentrationAtTime, type DoseLog } from "@/lib/pharmacokinetics";
import { getAllPersonalizedHalfLives } from "@/lib/health-profile";
import { getActiveInteractions } from "@/lib/interactions";

const VALID_MODES: OptimizationMode[] = ["health", "productivity"];

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sleepByParam = searchParams.get("sleepBy");
    const modeParam = searchParams.get("mode");
    const dayStartParam = searchParams.get("dayStart");
    const dayEndParam = searchParams.get("dayEnd");
    const localDateParam = searchParams.get("localDate");

    const mode: OptimizationMode =
      modeParam && VALID_MODES.includes(modeParam as OptimizationMode)
        ? (modeParam as OptimizationMode)
        : "health";

    let dayStart: Date;
    let dayEnd: Date;
    if (dayStartParam && dayEndParam) {
      dayStart = new Date(dayStartParam);
      dayEnd = new Date(dayEndParam);
    } else {
      const today = new Date();
      dayStart = new Date(today);
      dayStart.setHours(0, 0, 0, 0);
      dayEnd = new Date(today);
      dayEnd.setHours(23, 59, 59, 999);
    }

    const dateStr = localDateParam ?? dayStart.toISOString().slice(0, 10);

    const fourteenDaysAgo = new Date(dayStart.getTime() - 14 * 86_400_000);

    const [localEvents, tasks, recentLogs, allLogs] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          userId,
          AND: [{ start: { lte: dayEnd } }, { end: { gte: dayStart } }],
        },
        orderBy: { start: "asc" },
      }),
      prisma.task.findMany({
        where: {
          userId,
          dueDate: { gte: dayStart, lte: dayEnd },
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
      prisma.stimulantLog.findMany({
        where: { userId, loggedAt: { gte: new Date(dayStart.getTime() - 24 * 60 * 60 * 1000) } },
        orderBy: { loggedAt: "desc" },
      }),
      prisma.stimulantLog.findMany({
        where: { userId, loggedAt: { gte: fourteenDaysAgo } },
        orderBy: { loggedAt: "desc" },
      }),
    ]);

    let googleEvents: { id: string; title: string; start: string; end: string; allDay: boolean; source: "google" }[] = [];
    try {
      const tokenRow = await prisma.googleCalendarToken.findUnique({ where: { userId } });
      if (tokenRow) {
        googleEvents = await getCalendarEvents(
          tokenRow.refreshToken,
          dayStart.toISOString(),
          dayEnd.toISOString()
        );
      }
    } catch (e) {
      console.error("Dashboard: Google Calendar fetch failed (non-fatal):", e);
    }

    const events = [
      ...localEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
        allDay: e.allDay,
      })),
      ...googleEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
      })),
    ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const now = new Date();
    let sleepByDate: Date;
    const [sleepH, sleepM] = (sleepByParam ?? "22:00").split(":").map(Number);
    sleepByDate = new Date(dayStart.getTime() + ((sleepH ?? 22) * 60 + (sleepM ?? 0)) * 60000);
    if (sleepByDate <= now) {
      sleepByDate = new Date(sleepByDate.getTime() + 24 * 60 * 60000);
    }

    const healthProfileRow = await prisma.userHealthProfile.findUnique({ where: { userId } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hpRow = healthProfileRow as any;
    const healthProfile = healthProfileRow
      ? {
          weightKg: hpRow.weightKg ?? null,
          heightCm: hpRow.heightCm ?? null,
          allergies: hpRow.allergies ?? null,
          medications: hpRow.medications ?? null,
          sex: hpRow.sex ?? null,
          smokingStatus: hpRow.smokingStatus ?? null,
          birthYear: hpRow.birthYear ?? null,
        }
      : null;

    const personalizedHalfLives = getAllPersonalizedHalfLives(healthProfile);

    const todayLoggedSubstances = Array.from(
      new Set(recentLogs.map((l) => l.substance as SubstanceType)),
    );
    const enabledSubstances: SubstanceType[] = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"];
    const interactions = getActiveInteractions(enabledSubstances, healthProfile, todayLoggedSubstances);

    const doseLogs: DoseLog[] = allLogs.map((l) => ({
      substance: l.substance,
      amountMg: l.amountMg,
      loggedAt: l.loggedAt,
    }));

    const lastDoseBySubstance: Partial<Record<SubstanceType, Date>> = {};
    const lastDoseAmountMgBySubstance: Partial<Record<SubstanceType, number>> = {};
    for (const log of recentLogs) {
      if (!lastDoseBySubstance[log.substance as SubstanceType]) {
        lastDoseBySubstance[log.substance as SubstanceType] = log.loggedAt;
        if (log.amountMg != null) {
          lastDoseAmountMgBySubstance[log.substance as SubstanceType] = log.amountMg;
        }
      }
    }
    const dosesToday = countDosesLast24h(
      recentLogs.map((l) => ({ substance: l.substance, loggedAt: l.loggedAt })),
      now,
    );
    const totalMgToday = sumTotalMgLast24h(
      recentLogs.map((l) => ({ substance: l.substance, loggedAt: l.loggedAt, amountMg: l.amountMg })),
      now,
    );

    const cutoffs = getCutoffTimes(sleepByDate, "health", undefined, healthProfile);
    const nextDoseWindows = getNextDoseWindows(
      lastDoseBySubstance,
      now,
      mode,
      dosesToday,
      sleepByDate,
      totalMgToday,
      lastDoseAmountMgBySubstance,
      healthProfile,
      { allLogs: doseLogs, halfLives: personalizedHalfLives, interactions },
    );

    const sleepReadiness = getSleepReadiness(doseLogs, now, personalizedHalfLives);

    // Current active levels for dashboard summary
    const currentLevels: Partial<Record<SubstanceType, number>> = {};
    for (const s of enabledSubstances) {
      const level = getConcentrationAtTime(doseLogs, s, now, personalizedHalfLives[s]);
      if (level > 0.1) currentLevels[s] = Math.round(level * 10) / 10;
    }

    const nextEventToday = events.find((e) => new Date(e.start) > now);
    const doseForPeak = nextEventToday
      ? getDoseForPeakAt(new Date(nextEventToday.start), mode, sleepByDate, healthProfile)
      : [];

    return NextResponse.json({
      date: dateStr,
      mode,
      sleepBy: sleepByDate.toISOString(),
      events,
      tasks,
      cutoffs,
      governmentLimits: getGovernmentLimits(),
      nextDoseWindows,
      nextEventToday: nextEventToday
        ? { id: nextEventToday.id, title: nextEventToday.title, start: nextEventToday.start, end: nextEventToday.end }
        : null,
      doseForPeakAtNextEvent: doseForPeak,
      // New concentration-aware data
      sleepReadiness,
      currentLevels,
      interactions: interactions.filter((ix) => ix.severity === "warning" || ix.severity === "danger"),
    });
  } catch (e) {
    console.error(e);
    const err = e as Error & { code?: string };
    const isDbError =
      err.code === "P1001" ||
      err.code === "P1002" ||
      err.code === "P1017" ||
      (typeof err.message === "string" &&
        (err.message.includes("Can't reach database") ||
          err.message.includes("Connection") ||
          err.message.includes("connect ECONNREFUSED")));
    const body: { error: string; code?: string; detail?: string } = {
      error: "Dashboard failed",
    };
    if (isDbError) body.code = "DATABASE_UNAVAILABLE";
    if (process.env.NODE_ENV === "development") body.detail = err.message;
    return NextResponse.json(body, { status: 500 });
  }
}
