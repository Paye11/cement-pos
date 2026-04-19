import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import StockAssignmentLog from "@/lib/models/stock-assignment-log";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const cementType = searchParams.get("cementType");
    const limit = parseInt(searchParams.get("limit") || "100");

    const query: Record<string, unknown> = { deletedAt: null };
    if (userId) query.userId = userId;
    if (cementType && (cementType === "42.5" || cementType === "32.5")) {
      query.cementType = cementType;
    }

    const logs = await StockAssignmentLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name username")
      .populate("performedBy", "name username");

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l._id.toString(),
        user: l.userId
          ? {
              id: (l.userId as unknown as { _id: { toString(): string } })._id.toString(),
              name: (l.userId as unknown as { name: string }).name,
              username: (l.userId as unknown as { username: string }).username,
            }
          : null,
        cementType: l.cementType,
        action: l.action,
        amount: l.amount,
        performedBy: l.performedBy
          ? { name: (l.performedBy as unknown as { name: string }).name }
          : null,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get stock history error:", error);
    return NextResponse.json({ error: "Failed to fetch stock history" }, { status: 500 });
  }
}

