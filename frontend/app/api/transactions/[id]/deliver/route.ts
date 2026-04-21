import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/transaction";
import TransactionEvent from "@/lib/models/transaction-event";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
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

    // Only the owner of the transaction or an admin can mark as delivered
    if (transaction.userId.toString() !== session.userId && session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (transaction.status !== "Waiting for Delivery") {
      return NextResponse.json(
        { error: "Transaction is not waiting for delivery" },
        { status: 400 }
      );
    }

    // Update transaction to Pending (waiting for admin approval)
    transaction.status = "Pending";
    transaction.bagsDelivered = transaction.bagsSold;
    transaction.deliveryStatus = "Fully Delivered";
    await transaction.save();

    await TransactionEvent.create({
      transactionId: transaction._id,
      sellerId: transaction.userId,
      cementType: transaction.cementType,
      bagsSold: transaction.bagsSold,
      totalAmount: transaction.totalAmount,
      eventType: "Delivered",
      performedBy: session.userId,
      deletedAt: null,
    });

    return NextResponse.json({
      success: true,
      message: "Transaction marked as delivered and sent for admin approval",
    });
  } catch (error) {
    console.error("Deliver transaction error:", error);
    return NextResponse.json(
      { error: "Failed to mark as delivered" },
      { status: 500 }
    );
  }
}
