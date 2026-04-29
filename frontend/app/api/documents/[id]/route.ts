import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SellerDocument from "@/lib/models/seller-document";

function getCloudinaryResourceType(mimeType: string): "image" | "raw" {
  const m = mimeType.toLowerCase();
  if (m === "application/pdf") return "raw";
  if (m.startsWith("image/")) return "image";
  return "raw";
}

async function destroyFromCloudinary(publicId: string, mimeType: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { attempted: false, ok: false, result: "missing_env" as const };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const resourceType = getCloudinaryResourceType(mimeType);

  const stringToSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(stringToSign + apiSecret).digest("hex");

  const form = new URLSearchParams();
  form.set("public_id", publicId);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("invalidate", "true");
  form.set("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  const result = typeof data?.result === "string" ? data.result : "";
  const ok = res.ok && (result === "ok" || result === "not found");

  return { attempted: true, ok, result: result || (res.ok ? "ok" : "error") };
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (session.role !== "admin" && session.role !== "user") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
    }

    await connectToDatabase();

    const doc = await SellerDocument.findById(id).select("userId publicId mimeType deletedAt");
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (doc.deletedAt) {
      return NextResponse.json({ error: "Document has already been deleted" }, { status: 400 });
    }

    if (session.role === "user" && doc.userId.toString() !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const publicId = String(doc.publicId || "");
    const mimeType = String(doc.mimeType || "");

    const otherRefs =
      publicId.trim() !== ""
        ? await SellerDocument.countDocuments({
            _id: { $ne: new mongoose.Types.ObjectId(id) },
            publicId,
            deletedAt: null,
          })
        : 0;

    await SellerDocument.updateOne(
      { _id: new mongoose.Types.ObjectId(id), deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );

    let cloudinary = { attempted: false, ok: false, result: "skipped" };
    if (publicId.trim() !== "" && mimeType.trim() !== "" && otherRefs === 0) {
      cloudinary = await destroyFromCloudinary(publicId, mimeType);
    }

    return NextResponse.json({
      success: true,
      cloudinary: {
        attempted: cloudinary.attempted,
        ok: cloudinary.ok,
        result: cloudinary.result,
        skippedBecauseShared: otherRefs > 0,
      },
    });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

