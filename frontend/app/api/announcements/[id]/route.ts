import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Announcement from "@/lib/models/announcement";

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
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
      return NextResponse.json({ error: "Invalid announcement id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "update";

    await connectToDatabase();
    const a = await Announcement.findById(id);
    if (!a || a.deletedAt) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    const now = new Date();

    if (action === "end") {
      a.expiresAt = now;
      a.status = "Expired";
      await a.save();
      return NextResponse.json({ success: true });
    }

    const title = typeof body?.title === "string" ? body.title.trim() : null;
    const message = typeof body?.message === "string" ? body.message.trim() : null;
    const expiresAt = body?.expiresAt !== undefined ? parseIsoDate(body.expiresAt) : null;

    if (title !== null) {
      if (!title || title.length > 80) {
        return NextResponse.json({ error: "Title is required (max 80 characters)" }, { status: 400 });
      }
      a.title = title;
    }
    if (message !== null) {
      if (!message || message.length > 800) {
        return NextResponse.json({ error: "Message is required (max 800 characters)" }, { status: 400 });
      }
      a.message = message;
    }
    if (body?.expiresAt !== undefined) {
      if (!expiresAt) {
        return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
      }
      if (expiresAt.getTime() <= now.getTime() + 60_000) {
        return NextResponse.json({ error: "Expiry must be at least 1 minute in the future" }, { status: 400 });
      }
      a.expiresAt = expiresAt;
    }

    if (a.expiresAt.getTime() <= now.getTime()) {
      a.status = "Expired";
    } else {
      a.status = "Active";
    }

    await a.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update announcement error:", error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
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
      return NextResponse.json({ error: "Invalid announcement id" }, { status: 400 });
    }

    await connectToDatabase();
    const a = await Announcement.findById(id);
    if (!a || a.deletedAt) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    a.deletedAt = new Date();
    await a.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}

