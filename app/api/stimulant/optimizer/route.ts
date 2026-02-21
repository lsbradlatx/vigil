import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import {
  getCutoffTimes,
  getNextDoseWindows,
  getDoseForPeakAt,
  countDosesLast24h,
  sumTotalMgLast24h,
  getGovernmentLimits,
  type SubstanceType,
  type OptimizationMode,
} from "@/lib/stimulant-calculator";

const VALID_MODES: OptimizationMode[] = ["health", "productivity"];

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sleepBy = searchParams.get("sleepBy");
    const nowParam = searchParams.get("now");
    const modeParam = searchParams.get("mode");
    const dayStartParam = searchParams.get("dayStart");
    const dayEndParam = searchParams.get("dayEnd");

    const mode: OptimizationMode =
      modeParam && VALID_MODES.includes(modeParam as OptimizationMode)
        ? (modeParam as OptimizationMode)
        : "health";

    const now = nowParam ? new Date(nowParam) : new Date();

    let dayStart: Date;
    let dayEnd: Date;
    if (dayStartParam && dayEndParam) {
      dayStart = new Date(dayStartParam);
      dayEnd = new Date(dayEndParam);
    } else {
      dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      dayEnd = new Date(now);
      dayEnd.setHours(23, 59, 59, 999);
    }

    let sleepByDate: Date;
    const [sleepH, sleepM] = (sleepBy ?? "22:00").split(":").map(Number);
    sleepByDate = new Date(dayStart.getTime() + ((sleepH ?? 22) * 60 + (sleepM ?? 0)) * 60000);
    if (sleepByDate <= now) {
      sleepByDate = new Date(sleepByDate.getTime() + 24 * 60 * 60000);
    }

    const dayAgo = new Date(now);
    dayAgo.setDate(dayAgo.getDate() - 1);

    const [recentLogs, healthProfileRow] = await Promise.all([
      prisma.stimulantLog.findMany({
        where: { userId, loggedAt: { gte: dayAgo } },
        orderBy: { loggedAt: "desc" },
      }),
      prisma.userHealthProfile.findUnique({ where: { userId } }),
    ]);

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

    const healthProfile = healthProfileRow
      ? {
          weightKg: healthProfileRow.weightKg,
          heightCm: healthProfileRow.heightCm,
          allergies: healthProfileRow.allergies,
          medications: healthProfileRow.medications,
        }
      : null;

    const cutoffs = getCutoffTimes(sleepByDate, "health", undefined, healthProfile);
    const nextWindows = getNextDoseWindows(
      lastDoseBySubstance,
      now,
      mode,
      dosesToday,
      sleepByDate,
      totalMgToday,
      lastDoseAmountMgBySubstance,
      healthProfile
    );

    const payload: Record<string, unknown> = {
      now: now.toISOString(),
      sleepBy: sleepByDate.toISOString(),
      mode,
      cutoffs,
      governmentLimits: getGovernmentLimits(),
      nextDoseWindows: nextWindows,
      healthProfile: healthProfile ?? undefined,
    };

    const eventsToday = await prisma.calendarEvent.findMany({
      where: {
        userId,
        AND: [
          { start: { lte: dayEnd } },
          { end: { gte: dayStart } },
        ],
      },
      orderBy: { start: "asc" },
    });
    const nextEventToday = eventsToday.find((e) => new Date(e.start) > now);
    const doseForPeakAtNextEvent = nextEventToday
      ? getDoseForPeakAt(new Date(nextEventToday.start), mode, sleepByDate, healthProfile)
      : [];
    payload.eventsToday = eventsToday;
    payload.nextEventToday = nextEventToday
      ? { id: nextEventToday.id, title: nextEventToday.title, start: nextEventToday.start, end: nextEventToday.end }
      : null;
    payload.doseForPeakAtNextEvent = doseForPeakAtNextEvent;

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Optimizer failed" },
      { status: 500 }
    );
  }
}
