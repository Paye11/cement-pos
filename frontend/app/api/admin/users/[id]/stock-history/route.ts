import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import StockAssignmentLog from "@/lib/models/stock-assignment-log";
import Transaction from "@/lib/models/transaction";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: userId } = await params;
    await connectToDatabase();

    // Fetch all stock addition logs for this user
    const stockLogs = await StockAssignmentLog.find({
      userId,
      action: "add",
      deletedAt: null,
    }).sort({ createdAt: -1 });

    // Fetch all sales transactions for this user (for the "details" part)
    const sales = await Transaction.find({
      userId,
      status: "Approved",
      deletedAt: null,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      stockHistory: stockLogs.map(log => ({
        id: log._id.toString(),
        cementType: log.cementType,
        amount: log.amount,
        createdAt: log.createdAt,
      })),
      salesHistory: sales.map(sale => ({
        id: sale._id.toString(),
        cementType: sale.cementType,
        bagsSold: sale.bagsSold,
        totalAmount: sale.totalAmount,
        createdAt: sale.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching user history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
