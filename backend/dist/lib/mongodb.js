"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const user_1 = __importDefault(require("../models/user"));
const cement_price_1 = __importDefault(require("../models/cement-price"));
const inventory_1 = __importDefault(require("../models/inventory"));
let MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cement-store-pos";
const cached = global.mongooseCache || {
    conn: null,
    promise: null,
};
global.mongooseCache = cached;
let mongod = null;
async function connectToDatabase() {
    if (cached.conn)
        return cached.conn;
    if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is required in production");
    }
    if (process.env.NODE_ENV === "development" && !process.env.MONGODB_URI) {
        if (!mongod) {
            mongod = await mongodb_memory_server_1.MongoMemoryServer.create();
            MONGODB_URI = mongod.getUri();
        }
    }
    if (!cached.promise) {
        cached.promise = mongoose_1.default
            .connect(MONGODB_URI)
            .then((m) => m);
    }
    cached.conn = await cached.promise;
    if (mongod) {
        await seedDatabase();
    }
    return cached.conn;
}
async function seedDatabase() {
    const userCount = await user_1.default.countDocuments();
    if (userCount > 0)
        return;
    const bcrypt = (await Promise.resolve().then(() => __importStar(require("bcryptjs")))).default;
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await user_1.default.create({
        name: "Administrator",
        username: "admin",
        password: hashedPassword,
        role: "admin",
        status: "active",
    });
    await cement_price_1.default.create([
        { cementType: "42.5", pricePerBag: 1200 },
        { cementType: "32.5", pricePerBag: 1000 },
    ]);
    await inventory_1.default.create([
        { cementType: "42.5", totalStock: 100, remainingStock: 100 },
        { cementType: "32.5", totalStock: 100, remainingStock: 100 },
    ]);
}
