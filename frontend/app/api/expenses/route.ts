import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Expense from "@/lib/models/expense";
import Transaction from "@/lib/models/transaction";
import mongoose from "mongoose";

function isValidCementType(value: unknown): value is "42.5" | "32.5" {
  return value === "42.5" || value === "32.5";
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}

async function getUserSalesAndExpensesByType(userId: string) {
  const objectId = new mongoose.Types.ObjectId(userId);
  const [salesAgg, expenseAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { status: "Approved", userId: objectId } },
      {
        $group: {
          _id: "$cementType",
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { userId: objectId } },
      {
        $group: {
          _id: "$cementType",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const sales = { "42.5": 0, "32.5": 0 };
  for (const row of salesAgg as Array<{ _id: "42.5" | "32.5"; totalAmount: number }>) {
    if (row._id === "42.5" || row._id === "32.5") sales[row._id] = row.totalAmount;
  }

  const expenses = { "42.5": 0, "32.5": 0 };
  for (const row of expenseAgg as Array<{ _id: "42.5" | "32.5"; totalAmount: number }>) {
    if (row._id === "42.5" || row._id === "32.5") expenses[row._id] = row.totalAmount;
  }

  return {
    sales,
    expenses,
    remaining: {
      "42.5": Math.max(0, sales["42.5"] - expenses["42.5"]),
      "32.5": Math.max(0, sales["32.5"] - expenses["32.5"]),
    },
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
    const limit = parseInt(searchParams.get("limit") || "20");
    const userIdParam = searchParams.get("userId");

    const query: Record<string, unknown> = {};
    if (isAdmin(session) && userIdParam) {
      query.userId = userIdParam;
    } else if (!isAdmin(session)) {
      query.userId = session.userId;
    }

    const expenses = await Expense.find(query).sort({ createdAt: -1 }).limit(limit);

    const summaryUserId =
      isAdmin(session) && userIdParam ? userIdParam : !isAdmin(session) ? session.userId : null;

    const summary = summaryUserId ? await getUserSalesAndExpensesByType(summaryUserId) : null;

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id: e._id.toString(),
        userId: e.userId.toString(),
        cementType: e.cementType,
        amount: e.amount,
        note: e.note,
        createdAt: e.createdAt,
      })),
      summary,
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (session.role !== "user") {
      return NextResponse.json({ error: "Only sellers can record expenses" }, { status: 403 });
    }

    const body = await request.json();
    const cementType = body?.cementType;
    const amount = parsePositiveInt(body?.amount);
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!isValidCementType(cementType) || amount === null) {
      return NextResponse.json(
        { error: "Cement type and a valid positive amount are required" },
        { status: 400 }
      );
    }

    if (note.length > 200) {
      return NextResponse.json({ error: "Note cannot exceed 200 characters" }, { status: 400 });
    }

    await connectToDatabase();

    const summary = await getUserSalesAndExpensesByType(session.userId);
    const remainingForType = summary.remaining[cementType];

    if (amount > remainingForType) {
      return NextResponse.json(
        {
          error: `Insufficient available funds for cement ${cementType}. Available: ${remainingForType}`,
        },
        { status: 400 }
      );
    }

    const expense = await Expense.create({
      userId: session.userId,
      cementType,
      amount,
      note: note || undefined,
    });

    return NextResponse.json({
      success: true,
      expense: {
        id: expense._id.toString(),
        cementType: expense.cementType,
        amount: expense.amount,
        note: expense.note,
        createdAt: expense.createdAt,
      },
      summary: await getUserSalesAndExpensesByType(session.userId),
    });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
