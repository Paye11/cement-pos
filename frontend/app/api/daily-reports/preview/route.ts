import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/transaction";
import Holiday from "@/lib/models/holiday";
import "@/lib/models/user";

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const dateStart = parseDateOnly(dateParam);
    if (!dateStart) {
      return NextResponse.json({ error: "Invalid date (use YYYY-MM-DD)" }, { status: 400 });
    }

    const dateEnd = new Date(`${toYmd(dateStart)}T23:59:59.999Z`);
    const isSunday = dateStart.getUTCDay() === 0;

    const targetSellerId =
      isAdmin(session) && mongoose.Types.ObjectId.isValid(String(searchParams.get("sellerId") || ""))
        ? String(searchParams.get("sellerId"))
        : session.userId;

    if (session.role === "user" && targetSellerId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const holiday = await Holiday.findOne({ date: dateStart, deletedAt: null });
    const isHoliday = !!holiday;
    const isWorkingDay = !isSunday && !isHoliday;

    const now = new Date();
    const wouldBeLate = now.getTime() > dateEnd.getTime();

    const txQuery: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(targetSellerId),
      deletedAt: null,
      createdAt: { $gte: dateStart, $lte: dateEnd },
      status: { $ne: "Rejected" },
    };

    const transactions = await Transaction.find(txQuery).select(
      "cementType bagsSold totalAmount status isAdvancePayment"
    );

    const byType = {
      "32.5": { cementType: "32.5" as const, bags: 0, revenue: 0 },
      "42.5": { cementType: "42.5" as const, bags: 0, revenue: 0 },
    };

    let totalBags = 0;
    let totalRevenue = 0;
    let advancePaymentsCount = 0;
    let advancePaymentsAmount = 0;

    for (const t of transactions) {
      totalBags += t.bagsSold;
      totalRevenue += t.totalAmount;
      if (t.cementType === "32.5" || t.cementType === "42.5") {
        byType[t.cementType].bags += t.bagsSold;
        byType[t.cementType].revenue += t.totalAmount;
      }
      if (t.isAdvancePayment) {
        advancePaymentsCount += 1;
        advancePaymentsAmount += t.totalAmount;
      }
    }

    return NextResponse.json({
      date: toYmd(dateStart),
      isSunday,
      isHoliday,
      holidayName: holiday?.name || null,
      isWorkingDay,
      wouldBeLate,
      totals: {
        totalBags,
        totalRevenue,
        byCementType: [byType["32.5"], byType["42.5"]],
        advancePaymentsCount,
        advancePaymentsAmount,
      },
    });
  } catch (error) {
    console.error("Daily report preview error:", error);
    return NextResponse.json({ error: "Failed to preview daily report" }, { status: 500 });
  }
}

