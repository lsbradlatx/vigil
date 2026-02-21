import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
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
import { getConcentrationCurve, type DoseLog } from "@/lib/pharmacokinetics";
import { getAllPersonalizedHalfLives } from "@/lib/health-profile";
import { getActiveInteractions } from "@/lib/interactions";
import { getAllToleranceLevels } from "@/lib/tolerance";

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
    const enabledParam = searchParams.get("enabled");

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

    const enabledSubstances: SubstanceType[] = enabledParam
      ? (enabledParam.split(",").filter(Boolean) as SubstanceType[])
      : ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"];

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const dayAgo = new Date(now);
    dayAgo.setDate(dayAgo.getDate() - 1);

    const [allLogs, recentLogs, healthProfileRow] = await Promise.all([
      prisma.stimulantLog.findMany({
        where: { userId, loggedAt: { gte: fourteenDaysAgo } },
        orderBy: { loggedAt: "desc" },
      }),
      prisma.stimulantLog.findMany({
        where: { userId, loggedAt: { gte: dayAgo } },
        orderBy: { loggedAt: "desc" },
      }),
      prisma.userHealthProfile.findUnique({ where: { userId } }),
    ]);

    const hpRow = healthProfileRow as Record<string, unknown> | null;
    const healthProfile = healthProfileRow
      ? {
          weightKg: (hpRow?.weightKg as number | null) ?? null,
          heightCm: (hpRow?.heightCm as number | null) ?? null,
          allergies: (hpRow?.allergies as string | null) ?? null,
          medications: (hpRow?.medications as string | null) ?? null,
          sex: (hpRow?.sex as string | null) ?? null,
          smokingStatus: (hpRow?.smokingStatus as string | null) ?? null,
          birthYear: (hpRow?.birthYear as number | null) ?? null,
        }
      : null;

    const personalizedHalfLives = getAllPersonalizedHalfLives(healthProfile);

    const todayLoggedSubstances = Array.from(
      new Set(recentLogs.map((l) => l.substance as SubstanceType)),
    );
    const interactions = getActiveInteractions(enabledSubstances, healthProfile, todayLoggedSubstances);

    const doseLogs: DoseLog[] = allLogs.map((l) => ({
      substance: l.substance,
      amountMg: l.amountMg,
      loggedAt: l.loggedAt,
    }));
    const pkLookbackCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const activeDoseLogs = doseLogs.filter(
      (log) =>
        enabledSubstances.includes(log.substance as SubstanceType) &&
        log.loggedAt >= pkLookbackCutoff,
    );

    const tolerance = getAllToleranceLevels(doseLogs, now);

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
    const nextWindows = getNextDoseWindows(
      lastDoseBySubstance,
      now,
      mode,
      dosesToday,
      sleepByDate,
      totalMgToday,
      lastDoseAmountMgBySubstance,
      healthProfile,
      { allLogs: activeDoseLogs, halfLives: personalizedHalfLives, interactions },
    );

    const sleepReadiness = getSleepReadiness(activeDoseLogs, now, personalizedHalfLives);

    // Concentration curves for timeline chart
    const chartStart = new Date(dayStart);
    chartStart.setHours(5, 0, 0, 0);
    const chartEnd = new Date(sleepByDate.getTime() + 2 * 3_600_000);
    const concentrationCurves: Record<string, { time: number; mgActive: number }[]> = {};
    for (const substance of enabledSubstances) {
      concentrationCurves[substance] = getConcentrationCurve(
        activeDoseLogs, substance, chartStart, chartEnd, personalizedHalfLives[substance], 10,
      );
    }

    const eventsToday = await prisma.calendarEvent.findMany({
      where: {
        userId,
        AND: [{ start: { lte: dayEnd } }, { end: { gte: dayStart } }],
      },
      orderBy: { start: "asc" },
    });
    const nextEventToday = eventsToday.find((e) => new Date(e.start) > now);
    const doseForPeakAtNextEvent = nextEventToday
      ? getDoseForPeakAt(new Date(nextEventToday.start), mode, sleepByDate, healthProfile)
      : [];

    return NextResponse.json({
      now: now.toISOString(),
      sleepBy: sleepByDate.toISOString(),
      mode,
      cutoffs,
      governmentLimits: getGovernmentLimits(),
      nextDoseWindows: nextWindows,
      healthProfile: healthProfile ?? undefined,
      personalizedHalfLives,
      interactions,
      tolerance,
      sleepReadiness,
      concentrationCurves,
      chartStart: chartStart.getTime(),
      chartEnd: chartEnd.getTime(),
      eventsToday,
      nextEventToday: nextEventToday
        ? { id: nextEventToday.id, title: nextEventToday.title, start: nextEventToday.start, end: nextEventToday.end }
        : null,
      doseForPeakAtNextEvent,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Optimizer failed" }, { status: 500 });
  }
}
