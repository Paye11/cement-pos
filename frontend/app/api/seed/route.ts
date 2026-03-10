import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/user";
import CementPrice from "@/lib/models/cement-price";
import Inventory from "@/lib/models/inventory";

export async function GET() {
  try {
    await connectToDatabase();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: "admin" });
    let adminCreated = false;
    
    if (!existingAdmin) {
      // Create default admin
      const hashedPassword = await bcrypt.hash("admin123", 12);
      await User.create({
        name: "Administrator",
        username: "admin",
        password: hashedPassword,
        role: "admin",
        status: "active",
      });
      adminCreated = true;
    }

    // Initialize or update cement prices (stored in cents)
    // $12.00 for 42.5, $10.00 for 32.5
    await CementPrice.findOneAndUpdate(
      { cementType: "42.5" },
      { cementType: "42.5", pricePerBag: 1200 },
      { upsert: true, new: true }
    );
    await CementPrice.findOneAndUpdate(
      { cementType: "32.5" },
      { cementType: "32.5", pricePerBag: 1000 },
      { upsert: true, new: true }
    );

    // Initialize inventory
    await Inventory.findOneAndUpdate(
      { cementType: "42.5" },
      { cementType: "42.5", totalStock: 0, remainingStock: 0 },
      { upsert: true, new: true }
    );
    await Inventory.findOneAndUpdate(
      { cementType: "32.5" },
      { cementType: "32.5", totalStock: 0, remainingStock: 0 },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      adminCreated,
      credentials: adminCreated ? {
        username: "admin",
        password: "admin123"
      } : "Admin already exists",
      prices: {
        "42.5": "$12.00 per bag",
        "32.5": "$10.00 per bag"
      }
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 }
    );
  }
}
