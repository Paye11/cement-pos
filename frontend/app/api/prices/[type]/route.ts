import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CementPrice from "@/lib/models/cement-price";

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
    const body = await request.json();
    const { pricePerBag } = body;

    if (!["42.5", "32.5"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid cement type" },
        { status: 400 }
      );
    }

    if (typeof pricePerBag !== "number" || pricePerBag < 0) {
      return NextResponse.json(
        { error: "Invalid price. Must be a positive number." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const price = await CementPrice.findOneAndUpdate(
      { cementType: type },
      { pricePerBag },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      price: {
        cementType: price.cementType,
        pricePerBag: price.pricePerBag,
        updatedAt: price.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update price error:", error);
    return NextResponse.json(
      { error: "Failed to update price" },
      { status: 500 }
    );
  }
}
