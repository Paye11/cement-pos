import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/transaction";
import CementPrice from "@/lib/models/cement-price";
import Inventory from "@/lib/models/inventory";
import UserInventory from "@/lib/models/user-inventory";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    const query: Record<string, unknown> = {};

    // Users can only see their own transactions
    if (!isAdmin(session)) {
      query.userId = session.userId;
    }

    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name username")
      .populate("approvedBy", "name username");

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t._id.toString(),
        userId: t.userId?._id?.toString(),
        seller: t.userId
          ? {
              name: (t.userId as unknown as { name: string }).name,
              username: (t.userId as unknown as { username: string }).username,
            }
          : null,
        cementType: t.cementType,
        bagsSold: t.bagsSold,
        pricePerBag: t.pricePerBag,
        totalAmount: t.totalAmount,
        status: t.status,
        rejectionReason: t.rejectionReason,
        approvedBy: t.approvedBy
          ? {
              name: (t.approvedBy as unknown as { name: string }).name,
            }
          : null,
        approvalDate: t.approvalDate,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only users (sellers) can create transactions
    if (session.role !== "user") {
      return NextResponse.json(
        { error: "Only sellers can create sales" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cementType, bagsSold } = body;

    if (!cementType || !bagsSold) {
      return NextResponse.json(
        { error: "Cement type and bags sold are required" },
        { status: 400 }
      );
    }

    if (!["42.5", "32.5"].includes(cementType)) {
      return NextResponse.json(
        { error: "Invalid cement type" },
        { status: 400 }
      );
    }

    if (bagsSold < 1) {
      return NextResponse.json(
        { error: "At least 1 bag must be sold" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get current price
    const price = await CementPrice.findOne({ cementType });
    if (!price) {
      return NextResponse.json(
        { error: "Price not found for this cement type" },
        { status: 400 }
      );
    }

    // Check user inventory
    const userInventory = await UserInventory.findOne({
      userId: session.userId,
      cementType,
    });

    if (!userInventory || userInventory.remainingStock < bagsSold) {
      return NextResponse.json(
        {
          error: `Insufficient user stock. You only have ${
            userInventory?.remainingStock || 0
          } bags assigned.`,
        },
        { status: 400 }
      );
    }

    // Check global inventory (as a safety measure, though user inventory should be subset of global)
    const inventory = await Inventory.findOne({ cementType });
    if (!inventory || inventory.remainingStock < bagsSold) {
      return NextResponse.json(
        {
          error: `Insufficient global stock. Only ${
            inventory?.remainingStock || 0
          } bags available in store.`,
        },
        { status: 400 }
      );
    }

    const totalAmount = price.pricePerBag * bagsSold;

    const transaction = await Transaction.create({
      userId: session.userId,
      cementType,
      bagsSold,
      pricePerBag: price.pricePerBag,
      totalAmount,
      status: "Pending",
    });

    // Deduct from user inventory immediately (or reserve it)
    // Note: If transaction is rejected, we might need to add it back.
    // For now, let's assume "Pending" means "Reserved" so we deduct it.
    userInventory.remainingStock -= bagsSold;
    await userInventory.save();

    // Deduct from global inventory
    inventory.remainingStock -= bagsSold;
    await inventory.save();

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction._id.toString(),
        cementType: transaction.cementType,
        bagsSold: transaction.bagsSold,
        pricePerBag: transaction.pricePerBag,
        totalAmount: transaction.totalAmount,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
