import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Inventory from "@/lib/models/inventory";
import UserInventory from "@/lib/models/user-inventory";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    if (session.role === "user") {
      const inventory = await UserInventory.find({
        userId: session.userId,
        deletedAt: null,
      });

      return NextResponse.json({
        inventory: inventory.map((inv) => ({
          cementType: inv.cementType,
          totalStock: inv.totalAssigned,
          remainingStock: inv.remainingStock,
          updatedAt: inv.updatedAt,
        })),
      });
    }

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
