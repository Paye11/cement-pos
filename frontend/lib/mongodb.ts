import mongoose from "mongoose";
import { MongoMemoryServer } from 'mongodb-memory-server';

// Default to localhost MongoDB if no environment variable is set
let MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cement-store-pos";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

let mongod: MongoMemoryServer | null = null;

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in production");
  }

  // If running in development and no explicit MONGODB_URI, use MongoMemoryServer
  if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
    try {
      if (!mongod) {
        mongod = await MongoMemoryServer.create();
        MONGODB_URI = mongod.getUri();
      }
    } catch (error) {
      // Fallback to localhost if memory server fails
    }
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;

    // Seed data if using Memory Server (which starts empty)
    if (mongod) {
      await seedDatabase();
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

async function seedDatabase() {
  try {
    // Lazy load models and bcrypt to avoid circular deps or unnecessary imports in prod
    const User = (await import("@/lib/models/user")).default;
    const CementPrice = (await import("@/lib/models/cement-price")).default;
    const Inventory = (await import("@/lib/models/inventory")).default;
    const bcrypt = (await import("bcryptjs")).default; // Use default import for CJS compatibility

    const userCount = await User.countDocuments();
    if (userCount === 0) {
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
        { cementType: "32.5", pricePerBag: 1000 }
      ]);

      await Inventory.create([
        { cementType: "42.5", totalStock: 100, remainingStock: 100 },
        { cementType: "32.5", totalStock: 100, remainingStock: 100 }
      ]);
    }
  } catch (error) {
  }
}

export default connectToDatabase;
