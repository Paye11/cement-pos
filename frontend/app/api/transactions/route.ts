import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/transaction";
import CementPrice from "@/lib/models/cement-price";
import UserInventory from "@/lib/models/user-inventory";
import TransactionEvent from "@/lib/models/transaction-event";

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
    query.deletedAt = null;

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
        isAdvancePayment: t.isAdvancePayment,
        bagsDelivered: t.bagsDelivered,
        deliveryStatus: t.deliveryStatus,
        isNegotiatedPrice: t.isNegotiatedPrice,
        originalPricePerBag: t.originalPricePerBag,
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

    const body = await request.json().catch(() => ({}));
    const cementType = typeof body?.cementType === "string" ? body.cementType : "";
    const bagsSold = typeof body?.bagsSold === "number" ? body.bagsSold : Number(body?.bagsSold);
    const negotiatedPrice =
      typeof body?.negotiatedPrice === "number" ? body.negotiatedPrice : Number(body?.negotiatedPrice);
    const isAdvance = body?.isAdvancePayment === true;

    if (!cementType || !Number.isFinite(bagsSold)) {
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

    let userInventory: { remainingStock: number; save: () => Promise<unknown> } | null = null;
    if (!isAdvance) {
      userInventory = await UserInventory.findOne({
        userId: session.userId,
        cementType,
        deletedAt: null,
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
    }

    // Determine price to use
    const isNegotiated = Number.isFinite(negotiatedPrice) && negotiatedPrice > 0;
    const pricePerBag = isNegotiated ? negotiatedPrice : price.pricePerBag;
    const totalAmount = pricePerBag * bagsSold;

    // Determine initial status
    // If advance payment, it waits for delivery before it can be approved
    const status = isAdvance ? "Waiting for Delivery" : "Pending";

    const transaction = await Transaction.create({
      userId: session.userId,
      cementType,
      bagsSold,
      pricePerBag,
      totalAmount,
      status,
      isAdvancePayment: isAdvance,
      bagsDelivered: isAdvance ? 0 : bagsSold,
      deliveryStatus: isAdvance ? "Pending" : "Fully Delivered",
      isNegotiatedPrice: isNegotiated,
      originalPricePerBag: isNegotiated ? price.pricePerBag : undefined,
      deletedAt: null,
    });

    await TransactionEvent.create({
      transactionId: transaction._id,
      sellerId: session.userId,
      cementType,
      bagsSold,
      totalAmount,
      eventType: "Submitted",
      performedBy: session.userId,
      deletedAt: null,
    });

    if (!isAdvance) {
      if (!userInventory) {
        return NextResponse.json({ error: "User inventory not found" }, { status: 400 });
      }
      userInventory.remainingStock -= bagsSold;
      await userInventory.save();
    }

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
