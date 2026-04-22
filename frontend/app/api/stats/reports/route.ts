import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/transaction";
import User from "@/lib/models/user";
import Payroll from "@/lib/models/payroll";
import Expense from "@/lib/models/expense";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const targetUserId = searchParams.get("userId");

    await connectToDatabase();

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      dateFilter.$gte = start;
      dateFilter.$lte = end;
    } else {
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
    }

    const query: Record<string, unknown> = { status: "Approved" };
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }
    query.deletedAt = null;

    if (targetUserId) {
      query.userId = targetUserId;
    } else {
      const users = await User.find({ role: "user", deletedAt: null }).select("_id name username");
      const userIds = users.map((u) => u._id);
      query.userId = { $in: userIds };
    }

    const transactions = await Transaction.find(query)
      .populate("userId", "name username")
      .sort({ createdAt: -1 });

    const payrollQuery: Record<string, unknown> = {
      deletedAt: null,
      status: "Approved",
    };

    if (targetUserId) {
      payrollQuery.userId = targetUserId;
    } else {
      const users = await User.find({ role: "user", deletedAt: null }).select("_id name username");
      const userIds = users.map((u) => u._id);
      payrollQuery.userId = { $in: userIds };
    }

    const payroll = await Payroll.find(payrollQuery).populate("userId", "name username");

    const expenseQuery: Record<string, unknown> = {
      deletedAt: null,
    };
    if (targetUserId) {
      expenseQuery.userId = targetUserId;
    } else {
      const users = await User.find({ role: "user", deletedAt: null }).select("_id name username");
      const userIds = users.map((u) => u._id);
      expenseQuery.userId = { $in: userIds };
    }
    if (Object.keys(dateFilter).length > 0) {
      expenseQuery.createdAt = dateFilter;
    }
    const expenses = await Expense.find(expenseQuery).populate("userId", "name username");

    let start: Date | null = null;
    let end: Date | null = null;

    if (month && year) {
      start = new Date(parseInt(year), parseInt(month) - 1, 1);
      end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else {
      start = startDate ? new Date(startDate) : null;
      end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
    }

    const filteredPayroll = payroll.filter((p) => {
      if (month && year) {
        return p.month === parseInt(month) && p.year === parseInt(year);
      }
      const period = new Date(p.year, p.month - 1, 1);
      if (start && period < start) return false;
      if (end && period > end) return false;
      return true;
    });

    // Aggregate by cement type
    const byCementType: Record<
      string,
      { bags: number; revenue: number; count: number }
    > = {};
    const byUser: Record<
      string,
      {
        name: string;
        bags: number;
        totalAmount: number;
      count: number;
      payroll: number;
      expenses: number;
    }
  > = {};
  const byDate: Record<string, { bags: number; revenue: number }> = {};

  transactions.forEach((t) => {
    // By cement type
    if (!byCementType[t.cementType]) {
      byCementType[t.cementType] = { bags: 0, revenue: 0, count: 0 };
    }
    byCementType[t.cementType].bags += t.bagsSold;
    byCementType[t.cementType].revenue += t.totalAmount;
    byCementType[t.cementType].count += 1;

    // By user
    const userId = t.userId?._id?.toString() || "unknown";
    const userName =
      (t.userId as unknown as { name: string })?.name || "Unknown";
    if (!byUser[userId]) {
      byUser[userId] = { name: userName, bags: 0, totalAmount: 0, count: 0, payroll: 0, expenses: 0 };
    }
    byUser[userId].bags += t.bagsSold;
    byUser[userId].totalAmount += t.totalAmount;
    byUser[userId].count += 1;

    // By date
    const dateKey = new Date(t.createdAt).toISOString().split("T")[0];
    if (!byDate[dateKey]) {
      byDate[dateKey] = { bags: 0, revenue: 0 };
    }
    byDate[dateKey].bags += t.bagsSold;
    byDate[dateKey].revenue += t.totalAmount;
  });

  // Aggregate expenses by user
  expenses.forEach((e) => {
    const userId = e.userId?._id?.toString() || "unknown";
    if (!byUser[userId]) {
      const userName = (e.userId as unknown as { name: string })?.name || "Unknown";
      byUser[userId] = { name: userName, bags: 0, totalAmount: 0, count: 0, payroll: 0, expenses: 0 };
    }
    byUser[userId].expenses += e.amount;
  });

  // Calculate totals
  const totalBags = transactions.reduce((sum, t) => sum + t.bagsSold, 0);
  const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalTransactions = transactions.length;
  const payrollByUser = filteredPayroll.reduce((acc, p) => {
    const id = p.userId?._id?.toString() || "unknown";
    acc[id] = (acc[id] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);
  const totalPayroll = filteredPayroll.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netRevenue = totalRevenue - totalPayroll - totalExpenses;

  Object.keys(byUser).forEach((id) => {
    byUser[id].payroll = payrollByUser[id] || 0;
  });

  return NextResponse.json({
    summary: {
      totalBags,
      totalRevenue,
      totalTransactions,
      totalPayroll,
      totalExpenses,
      netRevenue,
    },
    byCementType: Object.entries(byCementType).map(([type, data]) => ({
      cementType: type,
      ...data,
    })),
    byUser: Object.entries(byUser)
      .map(([id, data]) => ({
        userId: id,
        ...data,
        revenue: data.totalAmount,
        netRevenue: data.totalAmount - data.payroll - data.expenses,
      }))
      .sort((a, b) => b.netRevenue - a.netRevenue),
      byDate: Object.entries(byDate)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
