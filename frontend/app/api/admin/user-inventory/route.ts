
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import UserInventory from "@/lib/models/user-inventory";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import User from "@/lib/models/user";
import Inventory from "@/lib/models/inventory";
import StockAssignmentLog from "@/lib/models/stock-assignment-log";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const token = (await cookies()).get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get URL params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      const inventory = await UserInventory.find({ userId, deletedAt: null });
      return NextResponse.json({ inventory });
    }

    const inventory = await UserInventory.find({ deletedAt: null }).populate("userId", "name username");
    return NextResponse.json({ inventory });
  } catch (error) {
    console.error("Error fetching user inventory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { userId, cementType, amount, action } = (await request.json()) as {
      userId?: string;
      cementType?: "42.5" | "32.5";
      amount?: number;
      action?: "add" | "remove";
    };

    if (!userId || !cementType || !amount || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["42.5", "32.5"].includes(cementType)) {
      return NextResponse.json({ error: "Invalid cement type" }, { status: 400 });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (action !== "add" && action !== "remove") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const user = await User.findById(userId).select("_id role");
    if (!user || user.role !== "user") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.deletedAt) {
      return NextResponse.json({ error: "User is in Recycle Bin" }, { status: 400 });
    }

    let inventory = await UserInventory.findOne({ userId, cementType, deletedAt: null });

    if (!inventory) {
      if (action === "remove") {
         return NextResponse.json({ error: "No inventory found to remove" }, { status: 404 });
      }
      inventory = new UserInventory({
        userId,
        cementType,
        totalAssigned: 0,
        remainingStock: 0,
        deletedAt: null,
      });
    }

    const globalInventory = await Inventory.findOne({ cementType });
    if (!globalInventory) {
      return NextResponse.json(
        { error: "Global inventory not found" },
        { status: 400 }
      );
    }

    if (action === "add") {
      if (globalInventory.remainingStock < amount) {
        return NextResponse.json(
          {
            error: `Insufficient global stock. Only ${globalInventory.remainingStock} bags available.`,
          },
          { status: 400 }
        );
      }
      inventory.totalAssigned += amount;
      inventory.remainingStock += amount;
      globalInventory.remainingStock -= amount;
    } else if (action === "remove") {
      if (inventory.remainingStock < amount) {
        return NextResponse.json(
          { error: "Insufficient stock to remove" },
          { status: 400 }
        );
      }
      inventory.totalAssigned = Math.max(0, inventory.totalAssigned - amount);
      inventory.remainingStock -= amount;
      globalInventory.remainingStock += amount;
    }

    await Promise.all([inventory.save(), globalInventory.save()]);

    await StockAssignmentLog.create({
      userId,
      cementType,
      action,
      amount: Math.floor(amount),
      performedBy: new mongoose.Types.ObjectId(payload.userId),
      deletedAt: null,
    });

    return NextResponse.json({ success: true, inventory });
  } catch (error) {
    console.error("Error updating user inventory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
