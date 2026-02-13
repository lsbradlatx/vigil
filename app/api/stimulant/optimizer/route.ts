import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCutoffTimes,
  getNextDoseWindows,
  getDoseForPeakAt,
  countDosesLast24h,
  type SubstanceType,
  type OptimizationMode,
} from "@/lib/stimulant-calculator";

const VALID_MODES: OptimizationMode[] = ["health", "productivity"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sleepBy = searchParams.get("sleepBy");
    const nowParam = searchParams.get("now");
    const modeParam = searchParams.get("mode");
    const dateParam = searchParams.get("date"); // YYYY-MM-DD — include today's events and dose-for-next-event

    const mode: OptimizationMode =
      modeParam && VALID_MODES.includes(modeParam as OptimizationMode)
        ? (modeParam as OptimizationMode)
        : "health";

    const now = nowParam ? new Date(nowParam) : new Date();

    let sleepByDate: Date;
    if (sleepBy) {
      if (sleepBy.includes("T") || sleepBy.includes("-")) {
        sleepByDate = new Date(sleepBy);
      } else {
        const [hours, minutes] = sleepBy.split(":").map(Number);
        sleepByDate = new Date(now);
        sleepByDate.setHours(hours ?? 22, minutes ?? 0, 0, 0);
        if (sleepByDate <= now) sleepByDate.setDate(sleepByDate.getDate() + 1);
      }
    } else {
      sleepByDate = new Date(now);
      sleepByDate.setHours(22, 0, 0, 0);
      if (sleepByDate <= now) sleepByDate.setDate(sleepByDate.getDate() + 1);
    }

    const dayAgo = new Date(now);
    dayAgo.setDate(dayAgo.getDate() - 1);
    const recentLogs = await prisma.stimulantLog.findMany({
      where: { loggedAt: { gte: dayAgo } },
      orderBy: { loggedAt: "desc" },
    });

    const lastDoseBySubstance: Partial<Record<SubstanceType, Date>> = {};
    for (const log of recentLogs) {
      if (!lastDoseBySubstance[log.substance as SubstanceType]) {
        lastDoseBySubstance[log.substance as SubstanceType] = log.loggedAt;
      }
    }

    const dosesToday = countDosesLast24h(
      recentLogs.map((l) => ({ substance: l.substance, loggedAt: l.loggedAt })),
      now
    );

    const cutoffs = getCutoffTimes(sleepByDate, mode);
    const nextWindows = getNextDoseWindows(
      lastDoseBySubstance,
      now,
      mode,
      dosesToday
    );

    const payload: Record<string, unknown> = {
      now: now.toISOString(),
      sleepBy: sleepByDate.toISOString(),
      mode,
      cutoffs,
      nextDoseWindows: nextWindows,
    };

    if (dateParam) {
      const dayStart = new Date(dateParam);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateParam);
      dayEnd.setHours(23, 59, 59, 999);
      const eventsToday = await prisma.calendarEvent.findMany({
        where: {
          AND: [
            { start: { lte: dayEnd } },
            { end: { gte: dayStart } },
          ],
        },
        orderBy: { start: "asc" },
      });
      const nextEventToday = eventsToday.find((e) => new Date(e.start) > now);
      const doseForPeakAtNextEvent = nextEventToday
        ? getDoseForPeakAt(new Date(nextEventToday.start), mode, sleepByDate)
        : [];
      payload.eventsToday = eventsToday;
      payload.nextEventToday = nextEventToday
        ? { id: nextEventToday.id, title: nextEventToday.title, start: nextEventToday.start, end: nextEventToday.end }
        : null;
      payload.doseForPeakAtNextEvent = doseForPeakAtNextEvent;
    }

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Optimizer failed" },
      { status: 500 }
    );
  }
}
