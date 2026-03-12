import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Inventory from "@/lib/models/inventory";
import User from "@/lib/models/user";
import UserInventory from "@/lib/models/user-inventory";

function isValidCementType(value: string): value is "42.5" | "32.5" {
  return value === "42.5" || value === "32.5";
}

async function getDistributedAssigned(cementType: "42.5" | "32.5") {
  const users = await User.find({ role: "user", deletedAt: null }).select("_id");
  const userIds = users.map((u) => u._id);

  const result = await UserInventory.aggregate([
    { $match: { userId: { $in: userIds }, cementType, deletedAt: null } },
    { $group: { _id: null, totalAssigned: { $sum: "$totalAssigned" } } },
  ]);

  return (result[0]?.totalAssigned as number | undefined) ?? 0;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { type } = await params;
    if (!isValidCementType(type)) {
      return NextResponse.json({ error: "Invalid cement type" }, { status: 400 });
    }

    const body = await request.json();
    const totalStock = Number(body?.totalStock);
    const remainingStock = Number(body?.remainingStock);

    if (!Number.isFinite(totalStock) || !Number.isFinite(remainingStock)) {
      return NextResponse.json({ error: "Invalid stock values" }, { status: 400 });
    }

    if (totalStock < 0 || remainingStock < 0) {
      return NextResponse.json({ error: "Stock cannot be negative" }, { status: 400 });
    }

    if (remainingStock > totalStock) {
      return NextResponse.json(
        { error: "Remaining stock cannot exceed total stock" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const distributedAssigned = await getDistributedAssigned(type);
    if (totalStock < distributedAssigned) {
      return NextResponse.json(
        {
          error: `Total stock cannot be less than distributed stock (${distributedAssigned} bags).`,
        },
        { status: 400 }
      );
    }

    const inventory = await Inventory.findOneAndUpdate(
      { cementType: type },
      { $set: { totalStock: Math.floor(totalStock), remainingStock: Math.floor(remainingStock) } },
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
    console.error("Update inventory error:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { type } = await params;
    if (!isValidCementType(type)) {
      return NextResponse.json({ error: "Invalid cement type" }, { status: 400 });
    }

    await connectToDatabase();

    const distributedAssigned = await getDistributedAssigned(type);
    if (distributedAssigned > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete Cement ${type} because ${distributedAssigned} bags have been distributed to users.`,
        },
        { status: 400 }
      );
    }

    await Inventory.deleteOne({ cementType: type });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete inventory error:", error);
    return NextResponse.json({ error: "Failed to delete inventory" }, { status: 500 });
  }
}

