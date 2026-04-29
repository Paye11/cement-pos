import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SellerDocument from "@/lib/models/seller-document";
import User from "@/lib/models/user";

type Category = "Receipt" | "Document";
type FileType = "image" | "pdf";
type RecipientType = "admin" | "seller";

function normalizeCategory(value: unknown): Category | null {
  if (value === "Receipt" || value === "Document") return value;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "receipt") return "Receipt";
  if (v === "document" || v === "documents") return "Document";
  return null;
}

function normalizeFileType(value: unknown): FileType | null {
  if (value === "image" || value === "pdf") return value;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "image") return "image";
  if (v === "pdf") return "pdf";
  return null;
}

function normalizeRecipientType(value: unknown): RecipientType | null {
  if (value === "admin" || value === "seller") return value;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "admin") return "admin";
  if (v === "seller" || v === "user") return "seller";
  return null;
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
    const category = normalizeCategory(searchParams.get("category"));
    const box = typeof searchParams.get("box") === "string" ? String(searchParams.get("box")) : "";
    const userIdParam = searchParams.get("userId");

    const query: Record<string, unknown> = { deletedAt: null };

    if (session.role === "user") {
      query.userId = session.userId;
      if (box === "sent") query.recipientType = "admin";
      if (box === "inbox") query.recipientType = "seller";
    } else if (session.role === "admin") {
      if (box === "sent") {
        query.recipientType = "seller";
        query.uploadedByRole = "admin";
        query.uploadedBy = session.userId;
      } else {
        query.recipientType = "admin";
      }
      if (userIdParam) query.userId = userIdParam;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (category) query.category = category;

    const docsQuery = SellerDocument.find(query).sort({ createdAt: -1 }).limit(limit);
    docsQuery.populate("userId", "name username");
    docsQuery.populate("uploadedBy", "name username role");
    const docs = await docsQuery;

    return NextResponse.json({
      documents: docs.map((d) => ({
        id: d._id.toString(),
        seller:
          d.userId && typeof d.userId === "object" && "_id" in d.userId
            ? {
                id: d.userId._id.toString(),
                name: (d.userId as unknown as { name?: string }).name || "",
                username: (d.userId as unknown as { username?: string }).username || "",
              }
            : null,
        uploadedBy:
          d.uploadedBy && typeof d.uploadedBy === "object" && "_id" in d.uploadedBy
            ? {
                id: d.uploadedBy._id.toString(),
                name: (d.uploadedBy as unknown as { name?: string }).name || "",
                username: (d.uploadedBy as unknown as { username?: string }).username || "",
              }
            : null,
        uploadedByRole: d.uploadedByRole || "user",
        recipientType: d.recipientType || "admin",
        category: d.category,
        title: d.title,
        fileType: d.fileType,
        mimeType: d.mimeType,
        url: d.url,
        publicId: d.publicId,
        bytes: d.bytes,
        format: d.format,
        originalFilename: d.originalFilename,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    const category = normalizeCategory(body?.category);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const fileType = normalizeFileType(body?.fileType);
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim() : "";
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const publicId = typeof body?.publicId === "string" ? body.publicId.trim() : "";
    const bytes = parsePositiveNumber(body?.bytes);
    const format = typeof body?.format === "string" ? body.format.trim() : "";
    const originalFilename =
      typeof body?.originalFilename === "string" ? body.originalFilename.trim() : "";

    if (!category || !fileType || !mimeType || !url || !publicId || bytes === null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!title || title.length > 80) {
      return NextResponse.json({ error: "Title is required (max 80 characters)" }, { status: 400 });
    }

    const isImageMime = mimeType.toLowerCase().startsWith("image/");
    const isPdfMime = mimeType.toLowerCase() === "application/pdf";
    if (fileType === "image" && !isImageMime) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
    }
    if (fileType === "pdf" && !isPdfMime) {
      return NextResponse.json({ error: "Invalid PDF type" }, { status: 400 });
    }

    await connectToDatabase();

    if (session.role === "user") {
      const doc = await SellerDocument.create({
        userId: session.userId,
        uploadedByRole: "user",
        uploadedBy: session.userId,
        recipientType: "admin",
        category,
        title,
        fileType,
        mimeType,
        url,
        publicId,
        bytes,
        format: format || undefined,
        originalFilename: originalFilename || undefined,
        deletedAt: null,
      });

      return NextResponse.json({
        success: true,
        document: {
          id: doc._id.toString(),
          category: doc.category,
          title: doc.title,
          fileType: doc.fileType,
          mimeType: doc.mimeType,
          url: doc.url,
          publicId: doc.publicId,
          bytes: doc.bytes,
          format: doc.format,
          originalFilename: doc.originalFilename,
          createdAt: doc.createdAt,
        },
      });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const sendToAll = Boolean(body?.sendToAll);
    const sellerId = typeof body?.sellerId === "string" ? body.sellerId.trim() : "";
    const recipientType = normalizeRecipientType(body?.recipientType) || "seller";

    if (recipientType !== "seller") {
      return NextResponse.json({ error: "Invalid recipient type" }, { status: 400 });
    }

    if (!sendToAll && !sellerId) {
      return NextResponse.json({ error: "Select a seller or choose send to all" }, { status: 400 });
    }

    if (sendToAll) {
      const sellers = await User.find({ role: "user", deletedAt: null }).select("_id");
      if (!sellers.length) {
        return NextResponse.json({ error: "No sellers found" }, { status: 400 });
      }

      const docsToCreate = sellers.map((s) => ({
        userId: s._id,
        uploadedByRole: "admin" as const,
        uploadedBy: session.userId,
        recipientType: "seller" as const,
        category,
        title,
        fileType,
        mimeType,
        url,
        publicId,
        bytes,
        format: format || undefined,
        originalFilename: originalFilename || undefined,
        deletedAt: null,
      }));

      await SellerDocument.insertMany(docsToCreate);
      return NextResponse.json({ success: true });
    }

    const doc = await SellerDocument.create({
      userId: sellerId,
      uploadedByRole: "admin",
      uploadedBy: session.userId,
      recipientType: "seller",
      category,
      title,
      fileType,
      mimeType,
      url,
      publicId,
      bytes,
      format: format || undefined,
      originalFilename: originalFilename || undefined,
      deletedAt: null,
    });

    return NextResponse.json({ success: true, document: { id: doc._id.toString() } });
  } catch (error) {
    console.error("Create document error:", error);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}

