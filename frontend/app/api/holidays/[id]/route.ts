import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Holiday from "@/lib/models/holiday";

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid holiday id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : null;
    const date = body?.date !== undefined ? parseDateOnly(body.date) : null;

    await connectToDatabase();
    const doc = await Holiday.findById(id);
    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    if (name !== null) {
      if (!name || name.length > 120) {
        return NextResponse.json({ error: "Holiday name is required (max 120)" }, { status: 400 });
      }
      doc.name = name;
    }

    if (body?.date !== undefined) {
      if (!date) {
        return NextResponse.json({ error: "Invalid holiday date" }, { status: 400 });
      }

      const existing = await Holiday.findOne({ _id: { $ne: doc._id }, date, deletedAt: null });
      if (existing) {
        return NextResponse.json({ error: "Holiday already exists for this date" }, { status: 400 });
      }
      doc.date = date;
    }

    await doc.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update holiday error:", error);
    return NextResponse.json({ error: "Failed to update holiday" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid holiday id" }, { status: 400 });
    }

    await connectToDatabase();
    const doc = await Holiday.findById(id);
    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    doc.deletedAt = new Date();
    await doc.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete holiday error:", error);
    return NextResponse.json({ error: "Failed to delete holiday" }, { status: 500 });
  }
}

