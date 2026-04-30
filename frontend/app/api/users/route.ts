import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin, hashPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/user";
import Inventory from "@/lib/models/inventory";
import UserInventory from "@/lib/models/user-inventory";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();

    const users = await User.find({ role: "user", deletedAt: null })
      .select("-password")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        centerName: u.centerName || "",
        name: u.name,
        location: u.location || "",
        contact: u.contact || "",
        username: u.username,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const centerName = typeof body?.centerName === "string" ? body.centerName.trim() : "";
    const location = typeof body?.location === "string" ? body.location.trim() : "";
    const contact = typeof body?.contact === "string" ? body.contact.trim() : "";
    const username = typeof body?.username === "string" ? body.username : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const initialStock = (body?.initialStock || {}) as Partial<Record<"42.5" | "32.5", number>>;

    if (!centerName || !name || !location || !contact || !username || !password) {
      return NextResponse.json(
        { error: "Center name, seller name, location, contact, username, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const initial425 = Number(initialStock?.["42.5"] ?? 0);
    const initial325 = Number(initialStock?.["32.5"] ?? 0);

    if (
      !Number.isFinite(initial425) ||
      !Number.isFinite(initial325) ||
      initial425 < 0 ||
      initial325 < 0
    ) {
      return NextResponse.json(
        { error: "Initial stock must be a non-negative number" },
        { status: 400 }
      );
    }

    const requested425 = Math.floor(initial425);
    const requested325 = Math.floor(initial325);

    if (requested425 > 0 || requested325 > 0) {
      const globalInventory = await Inventory.find({
        cementType: { $in: ["42.5", "32.5"] },
      });

      const globalMap = globalInventory.reduce(
        (acc, inv) => {
          acc[inv.cementType] = inv;
          return acc;
        },
        {} as Record<string, (typeof globalInventory)[number]>
      );

      const global425 = globalMap["42.5"];
      const global325 = globalMap["32.5"];

      if (!global425 || !global325) {
        return NextResponse.json(
          { error: "Global inventory is not initialized" },
          { status: 400 }
        );
      }

      if (requested425 > global425.remainingStock) {
        return NextResponse.json(
          {
            error: `Insufficient global stock for 42.5. Only ${global425.remainingStock} bags available.`,
          },
          { status: 400 }
        );
      }

      if (requested325 > global325.remainingStock) {
        return NextResponse.json(
          {
            error: `Insufficient global stock for 32.5. Only ${global325.remainingStock} bags available.`,
          },
          { status: 400 }
        );
      }
    }

    // Check if username exists
    const existingUser = await User.findOne({
      username: username.toLowerCase().trim(),
    });
    if (existingUser) {
      if (existingUser.deletedAt) {
        return NextResponse.json(
          { error: "A deleted user already has this username. Restore the user from Recycle Bin or choose a different username." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      centerName,
      name,
      location,
      contact,
      username: username.toLowerCase().trim(),
      password: hashedPassword,
      role: "user",
      status: "active",
    });

    const userInventoriesToCreate: Array<{
      cementType: "42.5" | "32.5";
      totalAssigned: number;
      remainingStock: number;
    }> = [];

    if (requested425 > 0) {
      userInventoriesToCreate.push({
        cementType: "42.5",
        totalAssigned: requested425,
        remainingStock: requested425,
      });
    }
    if (requested325 > 0) {
      userInventoriesToCreate.push({
        cementType: "32.5",
        totalAssigned: requested325,
        remainingStock: requested325,
      });
    }

    if (userInventoriesToCreate.length > 0) {
      try {
        await UserInventory.insertMany(
          userInventoriesToCreate.map((inv) => ({
            userId: user._id,
            cementType: inv.cementType,
            totalAssigned: inv.totalAssigned,
            remainingStock: inv.remainingStock,
          }))
        );

        const inventoryUpdates = await Inventory.find({
          cementType: { $in: userInventoriesToCreate.map((i) => i.cementType) },
        });

        const inventoryUpdateMap = inventoryUpdates.reduce(
          (acc, inv) => {
            acc[inv.cementType] = inv;
            return acc;
          },
          {} as Record<string, (typeof inventoryUpdates)[number]>
        );

        const inv425 = inventoryUpdateMap["42.5"];
        const inv325 = inventoryUpdateMap["32.5"];

        if (inv425 && requested425 > 0) inv425.remainingStock -= requested425;
        if (inv325 && requested325 > 0) inv325.remainingStock -= requested325;

        await Promise.all([
          inv425 ? inv425.save() : Promise.resolve(),
          inv325 ? inv325.save() : Promise.resolve(),
        ]);
      } catch (e) {
        await UserInventory.deleteMany({ userId: user._id });
        await User.findByIdAndDelete(user._id);
        throw e;
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        centerName: user.centerName || "",
        name: user.name,
        location: user.location || "",
        contact: user.contact || "",
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
