import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/user";
import UserInventory from "@/lib/models/user-inventory";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const users = await User.find({ role: "user", deletedAt: null }).select("_id");
    const userIds = users.map((u) => u._id);

    const distributionAgg = await UserInventory.aggregate([
      { $match: { userId: { $in: userIds }, deletedAt: null } },
      { $group: { _id: "$cementType", totalAssigned: { $sum: "$totalAssigned" } } },
    ]);

    const distribution: Record<"42.5" | "32.5", number> = { "42.5": 0, "32.5": 0 };
    for (const row of distributionAgg as Array<{ _id: "42.5" | "32.5"; totalAssigned: number }>) {
      if (row._id === "42.5" || row._id === "32.5") distribution[row._id] = row.totalAssigned;
    }

    return NextResponse.json({ distribution });
  } catch (error) {
    console.error("Inventory summary error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory summary" }, { status: 500 });
  }
}

