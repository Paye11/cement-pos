import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Announcement from "@/lib/models/announcement";
import "@/lib/models/user";

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function autoExpire(now: Date) {
  await Announcement.updateMany(
    { deletedAt: null, status: "Active", expiresAt: { $lte: now } },
    { $set: { status: "Expired" } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    const now = new Date();
    await autoExpire(now);

    const adminView = isAdmin(session);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "10")));
    const view = typeof searchParams.get("view") === "string" ? String(searchParams.get("view")) : "";

    const query: Record<string, unknown> = { deletedAt: null };

    if (adminView) {
      if (view === "history") query.status = "Expired";
      else if (view === "active") query.status = "Active";
    } else {
      query.status = "Active";
      query.expiresAt = { $gt: now };
    }

    const docs = await Announcement.find(query).sort({ createdAt: -1 }).limit(limit).populate("createdBy", "name");

    return NextResponse.json({
      announcements: docs.map((a) => {
        const base = {
          id: a._id.toString(),
          title: a.title,
          message: a.message,
          createdAt: a.createdAt,
        };

        if (!adminView) return base;

        return {
          ...base,
          status: a.status,
          expiresAt: a.expiresAt,
          createdBy:
            a.createdBy && typeof a.createdBy === "object" && "_id" in a.createdBy
              ? { name: (a.createdBy as unknown as { name?: string }).name || "" }
              : null,
        };
      }),
    });
  } catch (error) {
    console.error("Get announcements error:", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const expiresAt = parseIsoDate(body?.expiresAt);

    if (!title || title.length > 80) {
      return NextResponse.json({ error: "Title is required (max 80 characters)" }, { status: 400 });
    }
    if (!message || message.length > 800) {
      return NextResponse.json({ error: "Message is required (max 800 characters)" }, { status: 400 });
    }
    if (!expiresAt) {
      return NextResponse.json({ error: "Expiry date is required" }, { status: 400 });
    }

    const now = new Date();
    if (expiresAt.getTime() <= now.getTime() + 60_000) {
      return NextResponse.json({ error: "Expiry must be at least 1 minute in the future" }, { status: 400 });
    }

    await connectToDatabase();
    const a = await Announcement.create({
      title,
      message,
      status: "Active",
      expiresAt,
      createdBy: new mongoose.Types.ObjectId(session.userId),
      deletedAt: null,
    });

    return NextResponse.json({ success: true, id: a._id.toString() });
  } catch (error) {
    console.error("Create announcement error:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
