import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/user";
import Transaction from "@/lib/models/transaction";
import Expense from "@/lib/models/expense";
import UserInventory from "@/lib/models/user-inventory";
import Payroll from "@/lib/models/payroll";
import StockAssignmentLog from "@/lib/models/stock-assignment-log";
import TransactionEvent from "@/lib/models/transaction-event";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const users = await User.find({
      role: "user",
      deletedAt: { $ne: null },
    })
      .select("-password")
      .sort({ deletedAt: -1, createdAt: -1 });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        username: u.username,
        role: u.role,
        status: u.status,
        deletedAt: u.deletedAt,
        deletedStatus: u.deletedStatus,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get recycle bin users error:", error);
    return NextResponse.json({ error: "Failed to fetch recycle bin" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body as { userId?: string };
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.role === "admin") {
      return NextResponse.json({ error: "Cannot restore admin users" }, { status: 403 });
    }
    if (!user.deletedAt) {
      return NextResponse.json({ error: "User is not in Recycle Bin" }, { status: 400 });
    }

    user.deletedAt = null;
    const restoreStatus = user.deletedStatus || "active";
    user.deletedStatus = null;
    user.status = restoreStatus;
    await user.save();

    await Promise.all([
      Transaction.updateMany({ userId: user._id }, { $set: { deletedAt: null } }),
      Expense.updateMany({ userId: user._id }, { $set: { deletedAt: null } }),
      UserInventory.updateMany({ userId: user._id }, { $set: { deletedAt: null } }),
      Payroll.updateMany({ userId: user._id }, { $set: { deletedAt: null } }),
      StockAssignmentLog.updateMany({ userId: user._id }, { $set: { deletedAt: null } }),
      TransactionEvent.updateMany({ sellerId: user._id }, { $set: { deletedAt: null } }),
    ]);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Restore user error:", error);
    return NextResponse.json({ error: "Failed to restore user" }, { status: 500 });
  }
}
