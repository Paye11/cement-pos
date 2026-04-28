import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/transaction";
import Inventory from "@/lib/models/inventory";
import User from "@/lib/models/user";
import UserInventory from "@/lib/models/user-inventory";
import Expense from "@/lib/models/expense";
import mongoose from "mongoose";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    // For admin: show all stats
    // For user: show only their stats
    const isAdminUser = isAdmin(session);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get inventory
    const inventory = await Inventory.find({});
    const inventoryMap = inventory.reduce(
      (acc, inv) => {
        acc[inv.cementType] = {
          totalStock: inv.totalStock,
          remainingStock: inv.remainingStock,
        };
        return acc;
      },
      {} as Record<string, { totalStock: number; remainingStock: number }>
    );

    if (isAdminUser) {
      const users = await User.find({ role: "user", deletedAt: null }).select("name username");
      const userIds = users.map((u) => u._id);

      const [
        pendingCount,
        pendingExpenseCount,
        waitingForDeliveryCount,
        todaySales,
        allApproved,
        recentTransactions,
        userInventories,
        salesBreakdown,
        expenseBreakdown,
      ] = await Promise.all([
        Transaction.countDocuments({ status: "Pending", userId: { $in: userIds }, deletedAt: null }),
        Expense.countDocuments({ status: { $regex: /^pending\s*$/i }, userId: { $in: userIds }, deletedAt: null }),
        Transaction.countDocuments({ status: "Waiting for Delivery", userId: { $in: userIds }, deletedAt: null }),
        Transaction.find({
          status: "Approved",
          createdAt: { $gte: today },
          userId: { $in: userIds },
          deletedAt: null,
        }),
        Transaction.find({ status: "Approved", userId: { $in: userIds }, deletedAt: null }),
        Transaction.find({ userId: { $in: userIds }, deletedAt: null })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("userId", "name username"),
        UserInventory.find({ userId: { $in: userIds }, deletedAt: null }),
        Transaction.aggregate([
          { $match: { status: "Approved", userId: { $in: userIds }, deletedAt: null } },
          {
            $group: {
              _id: { userId: "$userId", cementType: "$cementType" },
              bagsSold: { $sum: "$bagsSold" },
              totalAmount: { $sum: "$totalAmount" },
            },
          },
        ]),
        Expense.aggregate([
          {
            $match: {
              userId: { $in: userIds },
              deletedAt: null,
              $or: [{ status: null }, { status: { $regex: /^approved\s*$/i } }],
            },
          },
          {
            $group: {
              _id: { userId: "$userId", cementType: "$cementType" },
              totalAmount: { $sum: "$amount" },
            },
          },
        ]),
      ]);

      const todayBags = todaySales.reduce((sum, t) => sum + t.bagsSold, 0);
      const todayRevenue = todaySales.reduce((sum, t) => sum + t.totalAmount, 0);
      const totalRevenue = allApproved.reduce((sum, t) => sum + t.totalAmount, 0);
      const totalBags = allApproved.reduce((sum, t) => sum + t.bagsSold, 0);

      const salesMap = salesBreakdown.reduce(
        (acc, row) => {
          const userId = row._id.userId.toString();
          const cementType = row._id.cementType as "42.5" | "32.5";
          if (!acc[userId]) {
            acc[userId] = {
              bagsSold: { "42.5": 0, "32.5": 0 },
              amount: { "42.5": 0, "32.5": 0 },
            };
          }
          acc[userId].bagsSold[cementType] = row.bagsSold;
          acc[userId].amount[cementType] = row.totalAmount;
          return acc;
        },
        {} as Record<
          string,
          {
            bagsSold: { "42.5": number; "32.5": number };
            amount: { "42.5": number; "32.5": number };
          }
        >
      );

      const expensesMap = expenseBreakdown.reduce(
        (acc, row) => {
          const userId = row._id.userId.toString();
          const cementType = row._id.cementType as "42.5" | "32.5";
          if (!acc[userId]) {
            acc[userId] = { amount: { "42.5": 0, "32.5": 0 } };
          }
          acc[userId].amount[cementType] = row.totalAmount;
          return acc;
        },
        {} as Record<string, { amount: { "42.5": number; "32.5": number } }>
      );

      const inventoryMapByUser = userInventories.reduce(
        (acc, inv) => {
          const userId = inv.userId.toString();
          if (!acc[userId]) {
            acc[userId] = {
              assigned: { "42.5": 0, "32.5": 0 },
              remaining: { "42.5": 0, "32.5": 0 },
            };
          }
          const cementType = inv.cementType as "42.5" | "32.5";
          acc[userId].assigned[cementType] = inv.totalAssigned;
          acc[userId].remaining[cementType] = inv.remainingStock;
          return acc;
        },
        {} as Record<
          string,
          {
            assigned: { "42.5": number; "32.5": number };
            remaining: { "42.5": number; "32.5": number };
          }
        >
      );

      const userStats = users.map((user) => {
        const userId = user._id.toString();
        const stock = inventoryMapByUser[userId] ?? {
          assigned: { "42.5": 0, "32.5": 0 },
          remaining: { "42.5": 0, "32.5": 0 },
        };
        const sales = salesMap[userId] ?? {
          bagsSold: { "42.5": 0, "32.5": 0 },
          amount: { "42.5": 0, "32.5": 0 },
        };
        const expenses = expensesMap[userId] ?? {
          amount: { "42.5": 0, "32.5": 0 },
        };
        const totalExpenses = expenses.amount["42.5"] + expenses.amount["32.5"];
        const totalSales = sales.amount["42.5"] + sales.amount["32.5"];

        return {
          id: userId,
          name: user.name,
          username: user.username,
          stock: {
            totalInStock: stock.remaining["42.5"] + stock.remaining["32.5"],
            assigned: stock.assigned,
            remaining: stock.remaining,
          },
          sales: {
            bagsSold: sales.bagsSold,
            amount: sales.amount,
            totalAmount: totalSales,
          },
          expenses: {
            amount: expenses.amount,
            totalAmount: totalExpenses,
          },
          net: {
            amount: {
              "42.5": sales.amount["42.5"] - expenses.amount["42.5"],
              "32.5": sales.amount["32.5"] - expenses.amount["32.5"],
            },
            totalAmount: totalSales - totalExpenses,
          },
        };
      });

      // Low stock warning (less than 100 bags)
      const lowStockWarnings = Object.entries(inventoryMap)
        .filter(([, inv]) => inv.remainingStock < 100)
        .map(([type]) => type);

      return NextResponse.json({
        pendingCount,
        pendingExpenseCount,
        waitingForDeliveryCount,
        todayBags,
        todayRevenue, // In cents
        totalRevenue, // In cents
        totalBags,
        inventory: inventoryMap,
        lowStockWarnings,
        userCount: users.length,
        userStats,
        recentTransactions: recentTransactions.map((t) => ({
          id: t._id.toString(),
          seller: t.userId
            ? {
                name: (t.userId as unknown as { name: string }).name,
                username: (t.userId as unknown as { username: string }).username,
              }
            : null,
          cementType: t.cementType,
          bagsSold: t.bagsSold,
          totalAmount: t.totalAmount,
          status: t.status,
          createdAt: t.createdAt,
        })),
      });
    } else {
      // User stats (seller)
      const [
        userTransactions,
        pendingCount,
        waitingForDeliveryCount,
        approvedCount,
        rejectedCount,
        userInventory,
      ] = await Promise.all([
        Transaction.find({ userId: session.userId, deletedAt: null })
          .sort({ createdAt: -1 })
          .limit(5),
        Transaction.countDocuments({
          userId: session.userId,
          status: "Pending",
          deletedAt: null,
        }),
        Transaction.countDocuments({
          userId: session.userId,
          status: "Waiting for Delivery",
          deletedAt: null,
        }),
        Transaction.countDocuments({
          userId: session.userId,
          status: "Approved",
          deletedAt: null,
        }),
        Transaction.countDocuments({
          userId: session.userId,
          status: "Rejected",
          deletedAt: null,
        }),
        UserInventory.find({ userId: session.userId, deletedAt: null }),
      ]);

      const userObjectId = new mongoose.Types.ObjectId(session.userId);
      const [userSalesByType, userExpensesByType] = await Promise.all([
        Transaction.aggregate([
          { $match: { status: "Approved", userId: userObjectId, deletedAt: null } },
          { $group: { _id: "$cementType", totalAmount: { $sum: "$totalAmount" } } },
        ]),
        Expense.aggregate([
          {
            $match: {
              userId: userObjectId,
              deletedAt: null,
              $or: [{ status: null }, { status: { $regex: /^approved\s*$/i } }],
            },
          },
          { $group: { _id: "$cementType", totalAmount: { $sum: "$amount" } } },
        ]),
      ]);

      const salesAmount = { "42.5": 0, "32.5": 0 };
      for (const row of userSalesByType as Array<{ _id: "42.5" | "32.5"; totalAmount: number }>) {
        if (row._id === "42.5" || row._id === "32.5") salesAmount[row._id] = row.totalAmount;
      }
      const expenseAmount = { "42.5": 0, "32.5": 0 };
      for (const row of userExpensesByType as Array<{ _id: "42.5" | "32.5"; totalAmount: number }>) {
        if (row._id === "42.5" || row._id === "32.5") expenseAmount[row._id] = row.totalAmount;
      }

      const todaySales = userTransactions.filter(
        (t) => t.createdAt >= today && t.status === "Approved"
      );
      const todayBags = todaySales.reduce((sum, t) => sum + t.bagsSold, 0);
      const todayRevenue = todaySales.reduce((sum, t) => sum + t.totalAmount, 0);

      const inventory = {
        "42.5": {
          assigned:
            userInventory.find((i) => i.cementType === "42.5")?.totalAssigned ||
            0,
          remaining:
            userInventory.find((i) => i.cementType === "42.5")?.remainingStock ||
            0,
        },
        "32.5": {
          assigned:
            userInventory.find((i) => i.cementType === "32.5")?.totalAssigned ||
            0,
          remaining:
            userInventory.find((i) => i.cementType === "32.5")?.remainingStock ||
            0,
        }
      };

      return NextResponse.json({
        pendingCount,
        waitingForDeliveryCount,
        approvedCount,
        rejectedCount,
        todayBags,
        todayRevenue,
        inventory,
        expenses: {
          amount: expenseAmount,
          totalAmount: expenseAmount["42.5"] + expenseAmount["32.5"],
        },
        net: {
          amount: {
            "42.5": salesAmount["42.5"] - expenseAmount["42.5"],
            "32.5": salesAmount["32.5"] - expenseAmount["32.5"],
          },
          totalAmount:
            salesAmount["42.5"] +
            salesAmount["32.5"] -
            (expenseAmount["42.5"] + expenseAmount["32.5"]),
        },
        recentTransactions: userTransactions.map((t) => ({
          id: t._id.toString(),
          cementType: t.cementType,
          bagsSold: t.bagsSold,
          totalAmount: t.totalAmount,
          status: t.status,
          createdAt: t.createdAt,
          rejectionReason: t.rejectionReason,
        })),
      });
    }
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
