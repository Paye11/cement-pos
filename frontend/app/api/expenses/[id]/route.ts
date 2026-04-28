import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Expense from "@/lib/models/expense";
import Transaction from "@/lib/models/transaction";
import mongoose from "mongoose";

type ExpenseStatus = "Pending" | "Approved" | "Rejected";

function normalizeExpenseStatus(value: unknown): ExpenseStatus | null {
  if (value === "Pending" || value === "Approved" || value === "Rejected") return value;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "pending") return "Pending";
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  return null;
}

async function getUserRemainingByType(userId: string) {
  const objectId = new mongoose.Types.ObjectId(userId);
  const [salesAgg, expenseAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { status: "Approved", userId: objectId, deletedAt: null } },
      {
        $group: {
          _id: "$cementType",
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { userId: objectId, status: { $in: ["Approved", "approved", null] }, deletedAt: null } },
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
    "42.5": Math.max(0, sales["42.5"] - expenses["42.5"]),
    "32.5": Math.max(0, sales["32.5"] - expenses["32.5"]),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectToDatabase();

    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (expense.deletedAt) {
      return NextResponse.json({ error: "Expense is not available" }, { status: 400 });
    }

    if (normalizeExpenseStatus(expense.status) !== "Pending") {
      return NextResponse.json({ error: "Expense has already been processed" }, { status: 400 });
    }

    if (action === "approve") {
      const remaining = await getUserRemainingByType(expense.userId.toString());
      const cementType = expense.cementType;
      if (expense.amount > remaining[cementType]) {
        return NextResponse.json(
          {
            error: `Insufficient available funds for cement ${cementType}. Available: ${remaining[cementType]}`,
          },
          { status: 400 }
        );
      }

      expense.status = "Approved";
      expense.reviewedAt = new Date();
      expense.reviewedBy = new mongoose.Types.ObjectId(session.userId);
      expense.rejectionReason = undefined;
      await expense.save();
    } else {
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (reason.length > 200) {
        return NextResponse.json(
          { error: "Rejection reason cannot exceed 200 characters" },
          { status: 400 }
        );
      }

      expense.status = "Rejected";
      expense.reviewedAt = new Date();
      expense.reviewedBy = new mongoose.Types.ObjectId(session.userId);
      expense.rejectionReason = reason || undefined;
      await expense.save();
    }

    return NextResponse.json({
      success: true,
      expense: {
        id: expense._id.toString(),
        userId: expense.userId.toString(),
        cementType: expense.cementType,
        amount: expense.amount,
        note: expense.note,
        status: expense.status,
        requestedAt: expense.requestedAt,
        reviewedAt: expense.reviewedAt,
        rejectionReason: expense.rejectionReason,
        createdAt: expense.createdAt,
      },
    });
  } catch (error) {
    console.error("Update expense status error:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
    }

    await connectToDatabase();

    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (expense.deletedAt) {
      return NextResponse.json({ error: "Expense has already been deleted" }, { status: 400 });
    }

    if (normalizeExpenseStatus(expense.status) !== "Approved") {
      return NextResponse.json({ error: "Only approved expenses can be deleted" }, { status: 400 });
    }

    expense.deletedAt = new Date();
    await expense.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
