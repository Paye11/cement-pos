import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const TOKEN_EXPIRY = "7d";

export interface SessionPayload {
  userId: string;
  username: string;
  role: "admin" | "user";
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return "dev-secret";
}

export function generateToken(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: Request): SessionPayload | null {
  const token =
    (req.cookies?.["auth-token"] as string | undefined) ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice("Bearer ".length)
      : undefined);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  (req as Request & { session: SessionPayload }).session = session;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (session.role !== "admin") {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }
  (req as Request & { session: SessionPayload }).session = session;
  next();
}
