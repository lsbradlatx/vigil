import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;
const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const row = await prisma.userHealthProfile.findUnique({ where: { userId } });
    if (!row) {
      const res = NextResponse.json({
        weightKg: null,
        heightCm: null,
        allergies: null,
        medications: null,
      });
      res.headers.set("Cache-Control", "private, max-age=60");
      return res;
    }
    const res = NextResponse.json({
      weightKg: row.weightKg,
      heightCm: row.heightCm,
      allergies: row.allergies,
      medications: row.medications,
    });
    res.headers.set("Cache-Control", "private, max-age=60");
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load health profile" },
      { status: 500 }
    );
  }
}

function parseAllergiesOrMedications(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const parts = value.filter((x) => typeof x === "string").map((x) => String(x).trim());
    return parts.length ? parts.join(", ") : null;
  }
  return null;
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      weightKg,
      heightCm,
      allergies,
      medications,
    } = body as {
      weightKg?: number | null;
      heightCm?: number | null;
      allergies?: string | string[] | null;
      medications?: string | string[] | null;
    };

    const data: {
      weightKg?: number | null;
      heightCm?: number | null;
      allergies?: string | null;
      medications?: string | null;
    } = {};

    if (weightKg !== undefined) {
      if (weightKg === null) data.weightKg = null;
      else if (typeof weightKg === "number" && Number.isFinite(weightKg)) {
        if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
          return NextResponse.json(
            { error: `Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg` },
            { status: 400 }
          );
        }
        data.weightKg = weightKg;
      }
    }
    if (heightCm !== undefined) {
      if (heightCm === null) data.heightCm = null;
      else if (typeof heightCm === "number" && Number.isFinite(heightCm)) {
        if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) {
          return NextResponse.json(
            { error: `Height must be between ${MIN_HEIGHT_CM} and ${MAX_HEIGHT_CM} cm` },
            { status: 400 }
          );
        }
        data.heightCm = heightCm;
      }
    }
    if (allergies !== undefined) data.allergies = parseAllergiesOrMedications(allergies);
    if (medications !== undefined) data.medications = parseAllergiesOrMedications(medications);

    const existing = await prisma.userHealthProfile.findUnique({ where: { userId } });
    if (existing) {
      const updated = await prisma.userHealthProfile.update({
        where: { userId },
        data,
      });
      return NextResponse.json({
        weightKg: updated.weightKg,
        heightCm: updated.heightCm,
        allergies: updated.allergies,
        medications: updated.medications,
      });
    }
    const created = await prisma.userHealthProfile.create({
      data: {
        weightKg: data.weightKg ?? null,
        heightCm: data.heightCm ?? null,
        allergies: data.allergies ?? null,
        medications: data.medications ?? null,
        userId,
      },
    });
    return NextResponse.json({
      weightKg: created.weightKg,
      heightCm: created.heightCm,
      allergies: created.allergies,
      medications: created.medications,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update health profile" },
      { status: 500 }
    );
  }
}
