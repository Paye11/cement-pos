"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.getSessionFromRequest = getSessionFromRequest;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const TOKEN_EXPIRY = "7d";
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 12);
}
async function verifyPassword(password, hashedPassword) {
    return bcryptjs_1.default.compare(password, hashedPassword);
}
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (secret)
        return secret;
    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET is required in production");
    }
    return "dev-secret";
}
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, getJwtSecret());
    }
    catch {
        return null;
    }
}
function getSessionFromRequest(req) {
    const token = req.cookies?.["auth-token"] ||
        (req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization.slice("Bearer ".length)
            : undefined);
    if (!token)
        return null;
    return verifyToken(token);
}
function requireAuth(req, res, next) {
    const session = getSessionFromRequest(req);
    if (!session) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    req.session = session;
    next();
}
function requireAdmin(req, res, next) {
    const session = getSessionFromRequest(req);
    if (!session) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    if (session.role !== "admin") {
        res.status(403).json({ error: "Unauthorized" });
        return;
    }
    req.session = session;
    next();
}
