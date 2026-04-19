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

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "admin") {
      return NextResponse.json({ error: "Cannot delete admin users" }, { status: 403 });
    }

    if (!user.deletedAt) {
      return NextResponse.json(
        { error: "User must be in Recycle Bin before permanent delete" },
        { status: 400 }
      );
    }

    await Promise.all([
      Transaction.deleteMany({ userId: user._id }),
      Expense.deleteMany({ userId: user._id }),
      UserInventory.deleteMany({ userId: user._id }),
      Payroll.deleteMany({ userId: user._id }),
      StockAssignmentLog.deleteMany({ userId: user._id }),
      TransactionEvent.deleteMany({ sellerId: user._id }),
      User.findByIdAndDelete(id),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Permanent delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user permanently" }, { status: 500 });
  }
}

