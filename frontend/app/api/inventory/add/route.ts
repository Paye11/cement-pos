import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Inventory from "@/lib/models/inventory";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { cementType, quantity } = body;

    if (!["42.5", "32.5"].includes(cementType)) {
      return NextResponse.json(
        { error: "Invalid cement type" },
        { status: 400 }
      );
    }

    if (typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const inventory = await Inventory.findOneAndUpdate(
      { cementType },
      {
        $inc: { totalStock: quantity, remainingStock: quantity },
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      inventory: {
        cementType: inventory.cementType,
        totalStock: inventory.totalStock,
        remainingStock: inventory.remainingStock,
        updatedAt: inventory.updatedAt,
      },
    });
  } catch (error) {
    console.error("Add inventory error:", error);
    return NextResponse.json(
      { error: "Failed to add inventory" },
      { status: 500 }
    );
  }
}
