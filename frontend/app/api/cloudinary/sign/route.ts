import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const body = await req.json().catch(() => ({}));
  const folder =
    typeof body.folder === "string" && body.folder.trim() ? body.folder.trim() : "cement-pos/uploads";

  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(stringToSign + apiSecret).digest("hex");

  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
}

