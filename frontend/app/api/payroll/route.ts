import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Payroll from "@/lib/models/payroll";
import User from "@/lib/models/user";

function parseIntParam(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

function isValidStatus(value: unknown): value is "Pending" | "Approved" {
  return value === "Pending" || value === "Approved";
}

function isValidPayrollType(value: unknown): value is "Seller" | "StoreBoy" {
  return value === "Seller" || value === "StoreBoy";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const month = parseIntParam(searchParams.get("month"));
    const year = parseIntParam(searchParams.get("year"));
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const limit = parseIntParam(searchParams.get("limit")) ?? 200;

    const users = await User.find({ role: "user", deletedAt: null }).select("_id");
    const userIds = users.map((u) => u._id);

    const query: Record<string, unknown> = {
      deletedAt: null,
      userId: { $in: userIds },
    };

    if (month !== null) query.month = month;
    if (year !== null) query.year = year;
    if (userId) {
      const requestedUser = await User.findOne({
        _id: userId,
        role: "user",
        deletedAt: null,
      }).select("_id");
      if (!requestedUser) {
        return NextResponse.json({ payroll: [] });
      }
      query.userId = userId;
    }
    if (status && isValidStatus(status)) query.status = status;

    const payroll = await Payroll.find(query)
      .sort({ year: -1, month: -1, createdAt: -1 })
      .limit(limit)
      .populate("userId", "name username")
      .populate("approvedBy", "name username");

    return NextResponse.json({
      payroll: payroll.map((p) => ({
        id: p._id.toString(),
        user: p.userId
          ? {
              id: (p.userId as unknown as { _id: { toString(): string } })._id.toString(),
              name: (p.userId as unknown as { name: string }).name,
              username: (p.userId as unknown as { username: string }).username,
            }
          : null,
        payrollType: p.payrollType,
        amount: p.amount,
        month: p.month,
        year: p.year,
        status: p.status,
        approvedBy: p.approvedBy
          ? { name: (p.approvedBy as unknown as { name: string }).name }
          : null,
        approvalDate: p.approvalDate,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get payroll error:", error);
    return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, payrollType, amount, month, year } = body as {
      userId?: string;
      payrollType?: string;
      amount?: number;
      month?: number;
      year?: number;
    };

    if (!userId || !isValidPayrollType(payrollType)) {
      return NextResponse.json({ error: "User and payroll type are required" }, { status: 400 });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 });
    }

    if (
      typeof month !== "number" ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12 ||
      typeof year !== "number" ||
      !Number.isFinite(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById(userId).select("_id role deletedAt");
    if (!user || user.role !== "user" || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await Payroll.findOne({
      userId,
      payrollType,
      month,
      year,
      deletedAt: null,
    }).select("_id");
    if (existing) {
      return NextResponse.json(
        { error: "Payroll for this user/type/month/year already exists" },
        { status: 400 }
      );
    }

    const payroll = await Payroll.create({
      userId,
      payrollType,
      amount: Math.floor(amount),
      month: Math.floor(month),
      year: Math.floor(year),
      status: "Pending",
      deletedAt: null,
    });

    return NextResponse.json({
      success: true,
      payroll: {
        id: payroll._id.toString(),
      },
    });
  } catch (error) {
    console.error("Create payroll error:", error);
    return NextResponse.json({ error: "Failed to create payroll" }, { status: 500 });
  }
}
