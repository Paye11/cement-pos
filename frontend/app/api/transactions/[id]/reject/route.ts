import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/transaction";
import Inventory from "@/lib/models/inventory";
import UserInventory from "@/lib/models/user-inventory";
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
    const body = await request.json();
    const { reason } = body;

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
    transaction.status = "Rejected";
    transaction.rejectionReason = reason || "No reason provided";
    transaction.approvedBy = new mongoose.Types.ObjectId(session.userId);
    transaction.approvalDate = new Date();
    await transaction.save();

    // Restore stock to user inventory
    const userInventory = await UserInventory.findOne({
      userId: transaction.userId,
      cementType: transaction.cementType,
    });

    if (userInventory) {
      userInventory.remainingStock += transaction.bagsSold;
      await userInventory.save();
    }

    // Restore stock to global inventory
    const inventory = await Inventory.findOne({
      cementType: transaction.cementType,
    });

    if (inventory) {
      inventory.remainingStock += transaction.bagsSold;
      await inventory.save();
    }

    return NextResponse.json({
      success: true,
      message: "Transaction rejected and stock restored",
    });
  } catch (error) {
    console.error("Reject transaction error:", error);
    return NextResponse.json(
      { error: "Failed to reject transaction" },
      { status: 500 }
    );
  }
}
