import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/user";
import CementPrice from "../models/cement-price";
import Inventory from "../models/inventory";

let MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/cement-store-pos";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

let mongod: MongoMemoryServer | null = null;

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in production");
  }

  if (process.env.NODE_ENV === "development" && !process.env.MONGODB_URI) {
    if (!mongod) {
      mongod = await MongoMemoryServer.create();
      MONGODB_URI = mongod.getUri();
    }
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m);
  }

  cached.conn = await cached.promise;

  if (mongod) {
    await seedDatabase();
  }

  return cached.conn;
}

async function seedDatabase() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return;

  const bcrypt = (await import("bcryptjs")).default;
  const hashedPassword = await bcrypt.hash("admin123", 12);

  await User.create({
    name: "Administrator",
    username: "admin",
    password: hashedPassword,
    role: "admin",
    status: "active",
  });

  await CementPrice.create([
    { cementType: "42.5", pricePerBag: 1200 },
    { cementType: "32.5", pricePerBag: 1000 },
  ]);

  await Inventory.create([
    { cementType: "42.5", totalStock: 100, remainingStock: 100 },
    { cementType: "32.5", totalStock: 100, remainingStock: 100 },
  ]);
}

