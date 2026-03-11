import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin, hashPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/user";
import Transaction from "@/lib/models/transaction";
import Expense from "@/lib/models/expense";
import UserInventory from "@/lib/models/user-inventory";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, username, status, password } = body;

    await connectToDatabase();

    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.deletedAt) {
      return NextResponse.json(
        { error: "Cannot edit a deleted user. Restore the user from Recycle Bin first." },
        { status: 400 }
      );
    }

    // Don't allow editing admin users
    if (user.role === "admin") {
      return NextResponse.json(
        { error: "Cannot edit admin users" },
        { status: 403 }
      );
    }

    // Check if new username conflicts with existing
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        username: username.toLowerCase().trim(),
        _id: { $ne: id },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 400 }
        );
      }
    }

    // Update fields
    if (name) user.name = name.trim();
    if (username) user.username = username.toLowerCase().trim();
    if (status) user.status = status;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      user.password = await hashPassword(password);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    await connectToDatabase();

    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.deletedAt) {
      return NextResponse.json(
        { error: "User is already in Recycle Bin" },
        { status: 400 }
      );
    }

    // Don't allow deleting admin users
    if (user.role === "admin") {
      return NextResponse.json(
        { error: "Cannot delete admin users" },
        { status: 403 }
      );
    }

    user.deletedAt = new Date();
    user.deletedStatus = user.status;
    user.status = "inactive";
    await user.save();

    await Promise.all([
      Transaction.updateMany({ userId: user._id }, { $set: { deletedAt: user.deletedAt } }),
      Expense.updateMany({ userId: user._id }, { $set: { deletedAt: user.deletedAt } }),
      UserInventory.updateMany({ userId: user._id }, { $set: { deletedAt: user.deletedAt } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "User moved to Recycle Bin",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
