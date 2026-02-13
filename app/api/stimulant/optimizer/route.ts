import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCutoffTimes,
  getNextDoseWindows,
  type SubstanceType,
} from "@/lib/stimulant-calculator";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sleepBy = searchParams.get("sleepBy"); // e.g. "22:00" or full ISO
    const nowParam = searchParams.get("now");

    const now = nowParam ? new Date(nowParam) : new Date();

    // Default sleep-by: today at 22:00 or tomorrow 22:00 if it's past 22:00
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

    // Last 24h of logs to get "last dose" per substance
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

    const cutoffs = getCutoffTimes(sleepByDate);
    const nextWindows = getNextDoseWindows(lastDoseBySubstance, now);

    return NextResponse.json({
      now: now.toISOString(),
      sleepBy: sleepByDate.toISOString(),
      cutoffs,
      nextDoseWindows: nextWindows,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Optimizer failed" },
      { status: 500 }
    );
  }
}
