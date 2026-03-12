import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Payroll from "@/lib/models/payroll";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const payroll = await Payroll.findById(id);
    if (!payroll || payroll.deletedAt) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    payroll.status = "Pending";
    payroll.approvedBy = undefined;
    payroll.approvalDate = undefined;
    await payroll.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set payroll pending error:", error);
    return NextResponse.json({ error: "Failed to update payroll" }, { status: 500 });
  }
}

