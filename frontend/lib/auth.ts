import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = "7d";

export interface JWTPayload {
  userId: string;
  username: string;
  role: "admin" | "user";
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
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

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({
    name: "auth-token",
    path: "/",
  });
}

export function isAdmin(session: JWTPayload | null): boolean {
  return session?.role === "admin";
}

export function isUser(session: JWTPayload | null): boolean {
  return session?.role === "user";
}
