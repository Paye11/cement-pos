import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Holiday from "@/lib/models/holiday";

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year") || "");

    const query: Record<string, unknown> = { deletedAt: null };
    if (Number.isFinite(year) && year >= 2000 && year <= 2100) {
      query.date = {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });

    return NextResponse.json({
      holidays: holidays.map((h) => ({
        id: h._id.toString(),
        name: h.name,
        date: h.date,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get holidays error:", error);
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const date = parseDateOnly(body?.date);

    if (!name || name.length > 120) {
      return NextResponse.json({ error: "Holiday name is required (max 120)" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Holiday date is required" }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await Holiday.findOne({ date, deletedAt: null });
    if (existing) {
      return NextResponse.json({ error: "Holiday already exists for this date" }, { status: 400 });
    }

    const doc = await Holiday.create({
      name,
      date,
      createdBy: new mongoose.Types.ObjectId(session.userId),
      deletedAt: null,
    });

    return NextResponse.json({ success: true, id: doc._id.toString() });
  } catch (error) {
    console.error("Create holiday error:", error);
    return NextResponse.json({ error: "Failed to create holiday" }, { status: 500 });
  }
}

