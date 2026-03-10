import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Inventory from "@/lib/models/inventory";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    const inventory = await Inventory.find({});

    return NextResponse.json({
      inventory: inventory.map((inv) => ({
        cementType: inv.cementType,
        totalStock: inv.totalStock,
        remainingStock: inv.remainingStock,
        updatedAt: inv.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
