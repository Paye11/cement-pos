import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/transaction";
import mongoose from "mongoose";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    await connectToDatabase();

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.deletedAt) {
      return NextResponse.json(
        { error: "Transaction is not available" },
        { status: 400 }
      );
    }

    if (transaction.status !== "Pending") {
      return NextResponse.json(
        { error: "Transaction has already been processed" },
        { status: 400 }
      );
    }

    // Update transaction
    transaction.status = "Approved";
    transaction.approvedBy = new mongoose.Types.ObjectId(session.userId);
    transaction.approvalDate = new Date();
    await transaction.save();

    return NextResponse.json({
      success: true,
      message: "Transaction approved successfully",
    });
  } catch (error) {
    console.error("Approve transaction error:", error);
    return NextResponse.json(
      { error: "Failed to approve transaction" },
      { status: 500 }
    );
  }
}
