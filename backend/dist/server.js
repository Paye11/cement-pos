"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_1 = require("./lib/mongodb");
const user_1 = __importDefault(require("./models/user"));
const auth_1 = require("./lib/auth");
const app = (0, express_1.default)();
const isProd = process.env.NODE_ENV === "production";
app.use(express_1.default.json({ limit: "2mb" }));
app.use((0, cookie_parser_1.default)());
if (isProd) {
    app.set("trust proxy", 1);
}
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
}));
app.get("/health", async (_req, res) => {
    const isConnected = mongoose_1.default.connection.readyState === 1;
    res.json({ ok: true, db: isConnected ? "connected" : "disconnected" });
});
app.post("/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: "Username and password are required" });
            return;
        }
        await (0, mongodb_1.connectToDatabase)();
        const user = await user_1.default.findOne({ username: username.toLowerCase().trim() });
        if (!user) {
            res.status(401).json({ error: "Invalid username or password" });
            return;
        }
        if (user.status === "inactive") {
            res.status(403).json({ error: "Account is inactive" });
            return;
        }
        const isValid = await (0, auth_1.verifyPassword)(password, user.password);
        if (!isValid) {
            res.status(401).json({ error: "Invalid username or password" });
            return;
        }
        const token = (0, auth_1.generateToken)({
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
    }
    catch {
        res.status(500).json({ error: "Login failed" });
    }
});
app.post("/auth/logout", (_req, res) => {
    res.clearCookie("auth-token", {
        path: "/",
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
    });
    res.json({ success: true });
});
app.get("/auth/me", auth_1.requireAuth, (req, res) => {
    const session = req.session;
    res.json({
        user: {
            id: session.userId,
            name: session.name,
            username: session.username,
            role: session.role,
        },
    });
});
app.get("/admin/health", auth_1.requireAdmin, (_req, res) => {
    res.json({ ok: true });
});
async function main() {
    await (0, mongodb_1.connectToDatabase)();
    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => {
        process.stdout.write(`Backend listening on http://localhost:${port}\n`);
    });
}
main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exit(1);
});
