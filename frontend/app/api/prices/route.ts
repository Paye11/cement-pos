import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CementPrice from "@/lib/models/cement-price";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    const prices = await CementPrice.find({});

    return NextResponse.json({
      prices: prices.map((p) => ({
        cementType: p.cementType,
        pricePerBag: p.pricePerBag, // In cents
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get prices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
