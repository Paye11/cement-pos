import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { connectToDatabase } from "./lib/mongodb";
import User from "./models/user";
import { generateToken, requireAuth, requireAdmin, verifyPassword } from "./lib/auth";

const app = express();
const isProd = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
if (isProd) {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.get("/health", async (_req: Request, res: Response) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({ ok: true, db: isConnected ? "connected" : "disconnected" });
});

app.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    await connectToDatabase();

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    if (user.status === "inactive") {
      res.status(403).json({ error: "Account is inactive" });
      return;
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
    });

    res.cookie("auth-token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 60 * 60 * 24 * 7 * 1000,
      path: "/",
    });

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("auth-token", {
    path: "/",
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  res.json({ success: true });
});

app.get("/auth/me", requireAuth, (req: Request, res: Response) => {
  const session = (req as unknown as { session: { userId: string; username: string; role: string; name: string } }).session;
  res.json({
    user: {
      id: session.userId,
      name: session.name,
      username: session.username,
      role: session.role,
    },
  });
});

app.get("/admin/health", requireAdmin, (_req: Request, res: Response) => {
  res.json({ ok: true });
});

async function main() {
  await connectToDatabase();
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => {
    process.stdout.write(`Backend listening on http://localhost:${port}\n`);
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
