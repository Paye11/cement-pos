import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Default to localhost MongoDB if no environment variable is set
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cement-store-pos";

// Define schemas inline for the seed script
const UserSchema = new mongoose.Schema(
  {
    name: String,
    username: { type: String, unique: true, lowercase: true },
    password: String,
    role: { type: String, enum: ["admin", "user"], default: "user" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

const CementPriceSchema = new mongoose.Schema(
  {
    cementType: { type: String, enum: ["42.5", "32.5"], unique: true },
    pricePerBag: Number, // Stored in cents
  },
  { timestamps: true }
);

const InventorySchema = new mongoose.Schema(
  {
    cementType: { type: String, enum: ["42.5", "32.5"], unique: true },
    totalStock: { type: Number, default: 0 },
    remainingStock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get or create models
    const User = mongoose.models.User || mongoose.model("User", UserSchema);
    const CementPrice =
      mongoose.models.CementPrice ||
      mongoose.model("CementPrice", CementPriceSchema);
    const Inventory =
      mongoose.models.Inventory ||
      mongoose.model("Inventory", InventorySchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists, skipping user creation");
    } else {
      // Create default admin
      const hashedPassword = await bcrypt.hash("admin123", 12);
      await User.create({
        name: "Administrator",
        username: "admin",
        password: hashedPassword,
        role: "admin",
        status: "active",
      });
      console.log("Created default admin user (username: admin, password: admin123)");
    }

    // Initialize or update cement prices (stored in cents)
    // $12.00 for 42.5, $10.00 for 32.5
    await CementPrice.findOneAndUpdate(
      { cementType: "42.5" },
      { cementType: "42.5", pricePerBag: 1200 },
      { upsert: true, new: true }
    );
    await CementPrice.findOneAndUpdate(
      { cementType: "32.5" },
      { cementType: "32.5", pricePerBag: 1000 },
      { upsert: true, new: true }
    );
    console.log("Initialized cement prices (42.5: $12.00, 32.5: $10.00)");

    // Initialize inventory
    await Inventory.findOneAndUpdate(
      { cementType: "42.5" },
      { cementType: "42.5", totalStock: 0, remainingStock: 0 },
      { upsert: true, new: true }
    );
    await Inventory.findOneAndUpdate(
      { cementType: "32.5" },
      { cementType: "32.5", totalStock: 0, remainingStock: 0 },
      { upsert: true, new: true }
    );
    console.log("Initialized inventory for both cement types");

    console.log("\nSeed completed successfully!");
    console.log("You can now login with:");
    console.log("  Username: admin");
    console.log("  Password: admin123");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seed();
