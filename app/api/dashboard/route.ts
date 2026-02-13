import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCutoffTimes,
  getNextDoseWindows,
  getDoseForPeakAt,
  countDosesLast24h,
  sumTotalMgLast24h,
  type SubstanceType,
  type OptimizationMode,
} from "@/lib/stimulant-calculator";

const VALID_MODES: OptimizationMode[] = ["health", "productivity"];

/**
 * GET /api/dashboard?date=YYYY-MM-DD&sleepBy=22:00&mode=health
 * Returns integrated data for the given day: events, tasks due, optimizer, and dose-for-peak for next event.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const sleepByParam = searchParams.get("sleepBy");
    const modeParam = searchParams.get("mode");

    const today = dateParam ? new Date(dateParam) : new Date();
    const mode: OptimizationMode =
      modeParam && VALID_MODES.includes(modeParam as OptimizationMode)
        ? (modeParam as OptimizationMode)
        : "health";

    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(today);
    dayEnd.setHours(23, 59, 59, 999);

    const dateStr = today.toISOString().slice(0, 10);

    const [events, tasks, recentLogs] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          AND: [
            { start: { lte: dayEnd } },
            { end: { gte: dayStart } },
          ],
        },
        orderBy: { start: "asc" },
      }),
      prisma.task.findMany({
        where: {
          dueDate: { gte: dayStart, lte: dayEnd },
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
      prisma.stimulantLog.findMany({
        where: { loggedAt: { gte: new Date(dayStart.getTime() - 24 * 60 * 60 * 1000) } },
        orderBy: { loggedAt: "desc" },
      }),
    ]);

    const now = new Date();
    let sleepByDate: Date;
    if (sleepByParam) {
      const [h, m] = sleepByParam.split(":").map(Number);
      sleepByDate = new Date(today);
      sleepByDate.setHours(h ?? 22, m ?? 0, 0, 0);
      if (sleepByDate <= now) sleepByDate.setDate(sleepByDate.getDate() + 1);
    } else {
      sleepByDate = new Date(today);
      sleepByDate.setHours(22, 0, 0, 0);
      if (sleepByDate <= now) sleepByDate.setDate(sleepByDate.getDate() + 1);
    }

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
      now
    );
    const totalMgToday = sumTotalMgLast24h(
      recentLogs.map((l) => ({ substance: l.substance, loggedAt: l.loggedAt, amountMg: l.amountMg })),
      now
    );

    const cutoffs = getCutoffTimes(sleepByDate, mode);
    const nextDoseWindows = getNextDoseWindows(
      lastDoseBySubstance,
      now,
      mode,
      dosesToday,
      totalMgToday,
      lastDoseAmountMgBySubstance
    );

    const nextEventToday = events.find((e) => new Date(e.start) > now);
    const doseForPeak = nextEventToday
      ? getDoseForPeakAt(new Date(nextEventToday.start), mode, sleepByDate)
      : [];

    return NextResponse.json({
      date: dateStr,
      mode,
      sleepBy: sleepByDate.toISOString(),
      events,
      tasks,
      cutoffs,
      nextDoseWindows,
      nextEventToday: nextEventToday
        ? {
            id: nextEventToday.id,
            title: nextEventToday.title,
            start: nextEventToday.start,
            end: nextEventToday.end,
          }
        : null,
      doseForPeakAtNextEvent: doseForPeak,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Dashboard failed" },
      { status: 500 }
    );
  }
}
