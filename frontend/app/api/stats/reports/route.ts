import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/lib/models/transaction";
import User from "@/lib/models/user";
import Payroll from "@/lib/models/payroll";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    await connectToDatabase();

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const query: Record<string, unknown> = { status: "Approved" };
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }
    query.deletedAt = null;

    const users = await User.find({ role: "user", deletedAt: null }).select("_id name username");
    const userIds = users.map((u) => u._id);
    query.userId = { $in: userIds };

    const transactions = await Transaction.find(query)
      .populate("userId", "name username")
      .sort({ createdAt: -1 });

    const payrollQuery: Record<string, unknown> = {
      deletedAt: null,
      status: "Approved",
      userId: { $in: userIds },
    };

    const payroll = await Payroll.find(payrollQuery).populate("userId", "name username");

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const filteredPayroll = payroll.filter((p) => {
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
        revenue: number;
        count: number;
        payroll: number;
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
        byUser[userId] = { name: userName, bags: 0, revenue: 0, count: 0, payroll: 0 };
      }
      byUser[userId].bags += t.bagsSold;
      byUser[userId].revenue += t.totalAmount;
      byUser[userId].count += 1;

      // By date
      const dateKey = new Date(t.createdAt).toISOString().split("T")[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { bags: 0, revenue: 0 };
      }
      byDate[dateKey].bags += t.bagsSold;
      byDate[dateKey].revenue += t.totalAmount;
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
    const netRevenue = totalRevenue - totalPayroll;

    Object.keys(byUser).forEach((id) => {
      byUser[id].payroll = payrollByUser[id] || 0;
    });

    return NextResponse.json({
      summary: {
        totalBags,
        totalRevenue,
        totalTransactions,
        totalPayroll,
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
          netRevenue: data.revenue - data.payroll,
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
