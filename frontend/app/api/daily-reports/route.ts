import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import DailyReport from "@/lib/models/daily-report";
import Transaction from "@/lib/models/transaction";
import Holiday from "@/lib/models/holiday";
import "@/lib/models/user";

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function isHoliday(dateStart: Date): Promise<{ isHoliday: boolean; name: string | null }> {
  const h = await Holiday.findOne({ date: dateStart, deletedAt: null }).select("name");
  return { isHoliday: !!h, name: h?.name || null };
}

async function computeTotals(sellerId: string, dateStart: Date) {
  const dateEnd = new Date(`${toYmd(dateStart)}T23:59:59.999Z`);

  const txQuery: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(sellerId),
    deletedAt: null,
    createdAt: { $gte: dateStart, $lte: dateEnd },
    status: { $ne: "Rejected" },
  };

  const transactions = await Transaction.find(txQuery).select(
    "cementType bagsSold totalAmount isAdvancePayment"
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

  return {
    totalBags,
    totalRevenue,
    byCementType: [byType["32.5"], byType["42.5"]],
    advancePaymentsCount,
    advancePaymentsAmount,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "30")));
    const lateOnly = searchParams.get("lateOnly") === "1";

    const query: Record<string, unknown> = { deletedAt: null };

    const startDate = parseDateOnly(searchParams.get("startDate"));
    const endDate = parseDateOnly(searchParams.get("endDate"));
    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) dateQuery.$gte = startDate;
      if (endDate) dateQuery.$lte = new Date(`${toYmd(endDate)}T23:59:59.999Z`);
      query.reportDate = dateQuery;
    }

    if (lateOnly) query.isLate = true;

    if (isAdmin(session)) {
      const sellerId = searchParams.get("sellerId");
      if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
        query.sellerId = sellerId;
      }
    } else {
      query.sellerId = session.userId;
    }

    const docsQuery = DailyReport.find(query)
      .sort({ reportDate: -1, submittedAt: -1 })
      .limit(limit);

    if (isAdmin(session)) {
      docsQuery.populate("sellerId", "name username");
    }

    const docs = await docsQuery;

    return NextResponse.json({
      reports: docs.map((r) => ({
        id: r._id.toString(),
        seller:
          isAdmin(session) && r.sellerId && typeof r.sellerId === "object" && "_id" in r.sellerId
            ? {
                id: (r.sellerId as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
                name: (r.sellerId as unknown as { name?: string }).name || "",
                username: (r.sellerId as unknown as { username?: string }).username || "",
              }
            : null,
        reportDate: r.reportDate,
        submittedAt: r.submittedAt,
        totalBags: r.totalBags,
        totalRevenue: r.totalRevenue,
        byCementType: r.byCementType,
        advancePaymentsCount: r.advancePaymentsCount,
        advancePaymentsAmount: r.advancePaymentsAmount,
        isLate: r.isLate,
        lateByMinutes: r.lateByMinutes,
      })),
    });
  } catch (error) {
    console.error("Get daily reports error:", error);
    return NextResponse.json({ error: "Failed to fetch daily reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const dateStart = parseDateOnly(body?.date);
    if (!dateStart) {
      return NextResponse.json({ error: "Invalid date (use YYYY-MM-DD)" }, { status: 400 });
    }

    const isSunday = dateStart.getUTCDay() === 0;

    await connectToDatabase();

    const holidayInfo = await isHoliday(dateStart);
    if (isSunday) {
      return NextResponse.json({ error: "Sunday is not counted for daily sales" }, { status: 400 });
    }
    if (holidayInfo.isHoliday) {
      return NextResponse.json(
        { error: `Holiday is not counted for daily sales: ${holidayInfo.name || "Holiday"}` },
        { status: 400 }
      );
    }

    const totals = await computeTotals(session.userId, dateStart);

    const now = new Date();
    const deadline = new Date(`${toYmd(dateStart)}T23:59:59.999Z`);
    const isLate = now.getTime() > deadline.getTime();
    const lateByMinutes = isLate ? Math.ceil((now.getTime() - deadline.getTime()) / 60_000) : 0;

    const report = await DailyReport.findOneAndUpdate(
      { sellerId: new mongoose.Types.ObjectId(session.userId), reportDate: dateStart },
      {
        $set: {
          totalBags: totals.totalBags,
          totalRevenue: totals.totalRevenue,
          byCementType: totals.byCementType,
          advancePaymentsCount: totals.advancePaymentsCount,
          advancePaymentsAmount: totals.advancePaymentsAmount,
          submittedAt: now,
          isLate,
          lateByMinutes,
          deletedAt: null,
        },
        $setOnInsert: {
          sellerId: new mongoose.Types.ObjectId(session.userId),
          reportDate: dateStart,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      report: {
        id: report._id.toString(),
        reportDate: report.reportDate,
        submittedAt: report.submittedAt,
        totalBags: report.totalBags,
        totalRevenue: report.totalRevenue,
        advancePaymentsCount: report.advancePaymentsCount,
        advancePaymentsAmount: report.advancePaymentsAmount,
        isLate: report.isLate,
        lateByMinutes: report.lateByMinutes,
      },
    });
  } catch (error) {
    console.error("Submit daily report error:", error);
    return NextResponse.json({ error: "Failed to submit daily report" }, { status: 500 });
  }
}

