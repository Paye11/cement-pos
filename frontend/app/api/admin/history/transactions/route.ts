import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import TransactionEvent from "@/lib/models/transaction-event";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const eventType = searchParams.get("eventType");
    const limit = parseInt(searchParams.get("limit") || "200");

    const query: Record<string, unknown> = { deletedAt: null };
    if (sellerId) query.sellerId = sellerId;
    if (eventType && (eventType === "Submitted" || eventType === "Approved" || eventType === "Rejected")) {
      query.eventType = eventType;
    }

    const events = await TransactionEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sellerId", "name username")
      .populate("performedBy", "name username");

    return NextResponse.json({
      events: events.map((e) => ({
        id: e._id.toString(),
        transactionId: e.transactionId.toString(),
        seller: e.sellerId
          ? {
              id: (e.sellerId as unknown as { _id: { toString(): string } })._id.toString(),
              name: (e.sellerId as unknown as { name: string }).name,
              username: (e.sellerId as unknown as { username: string }).username,
            }
          : null,
        cementType: e.cementType,
        bagsSold: e.bagsSold,
        totalAmount: e.totalAmount,
        eventType: e.eventType,
        performedBy: e.performedBy
          ? { name: (e.performedBy as unknown as { name: string }).name }
          : null,
        rejectionReason: e.rejectionReason,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get transaction history error:", error);
    return NextResponse.json({ error: "Failed to fetch transaction history" }, { status: 500 });
  }
}

