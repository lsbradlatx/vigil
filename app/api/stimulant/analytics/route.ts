import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import type { SubstanceType } from "@/lib/stimulant-calculator";

const SUBSTANCES: SubstanceType[] = ["CAFFEINE", "ADDERALL", "DEXEDRINE", "NICOTINE"];

const DEFAULT_DOSE_MG: Record<SubstanceType, number> = {
  CAFFEINE: 95,
  ADDERALL: 20,
  DEXEDRINE: 15,
  NICOTINE: 1,
};

interface DailyTotal {
  date: string;
  totalMg: number;
  doses: number;
}

interface SubstanceAnalytics {
  avg7d: number;
  avg30d: number;
  doses7d: number;
  doses30d: number;
  trend: "increasing" | "stable" | "decreasing";
  dailyTotals14d: DailyTotal[];
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.stimulantLog.findMany({
      where: { userId, loggedAt: { gte: thirtyDaysAgo } },
      orderBy: { loggedAt: "asc" },
      select: { substance: true, amountMg: true, loggedAt: true },
    });

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const analytics: Partial<Record<SubstanceType, SubstanceAnalytics>> = {};

    for (const substance of SUBSTANCES) {
      const substanceLogs = logs.filter((l) => l.substance === substance);
      if (substanceLogs.length === 0) continue;

      const getMg = (log: { amountMg: number | null }) =>
        log.amountMg != null && Number.isFinite(log.amountMg) && log.amountMg > 0
          ? log.amountMg
          : DEFAULT_DOSE_MG[substance];

      // 7-day stats
      const logs7d = substanceLogs.filter((l) => l.loggedAt >= sevenDaysAgo);
      const sum7d = logs7d.reduce((s, l) => s + getMg(l), 0);
      const avg7d = Math.round((sum7d / 7) * 10) / 10;

      // 30-day stats
      const sum30d = substanceLogs.reduce((s, l) => s + getMg(l), 0);
      const avg30d = Math.round((sum30d / 30) * 10) / 10;

      // Trend: compare first-half avg to second-half avg of last 14 days
      const logs14d = substanceLogs.filter((l) => l.loggedAt >= fourteenDaysAgo);
      const midpoint = new Date(fourteenDaysAgo.getTime() + 7 * 86_400_000);
      const firstHalf = logs14d.filter((l) => l.loggedAt < midpoint);
      const secondHalf = logs14d.filter((l) => l.loggedAt >= midpoint);
      const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, l) => s + getMg(l), 0) / 7 : 0;
      const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, l) => s + getMg(l), 0) / 7 : 0;

      let trend: "increasing" | "stable" | "decreasing" = "stable";
      if (secondAvg > firstAvg * 1.15) trend = "increasing";
      else if (secondAvg < firstAvg * 0.85) trend = "decreasing";

      // Daily totals for 14-day sparkline
      const dailyTotals14d: DailyTotal[] = [];
      for (let d = 13; d >= 0; d--) {
        const day = new Date(now);
        day.setDate(day.getDate() - d);
        const dateStr = day.toISOString().slice(0, 10);
        const dayLogs = logs14d.filter(
          (l) => l.loggedAt.toISOString().slice(0, 10) === dateStr,
        );
        dailyTotals14d.push({
          date: dateStr,
          totalMg: Math.round(dayLogs.reduce((s, l) => s + getMg(l), 0) * 10) / 10,
          doses: dayLogs.length,
        });
      }

      analytics[substance] = {
        avg7d,
        avg30d,
        doses7d: logs7d.length,
        doses30d: substanceLogs.length,
        trend,
        dailyTotals14d,
      };
    }

    // Longest recent gap without any stimulant
    const allDates = new Set<string>();
    for (const log of logs) {
      allDates.add(log.loggedAt.toISOString().slice(0, 10));
    }
    let longestStreak = 0;
    let currentStreak = 0;
    for (let d = 29; d >= 0; d--) {
      const day = new Date(now);
      day.setDate(day.getDate() - d);
      const dateStr = day.toISOString().slice(0, 10);
      if (!allDates.has(dateStr)) {
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    return NextResponse.json({
      analytics,
      cleanestStreak: longestStreak,
      totalLogs30d: logs.length,
    });
  } catch (e) {
    console.error("Analytics error:", e);
    return NextResponse.json({ error: "Analytics failed" }, { status: 500 });
  }
}
