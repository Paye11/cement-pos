"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  DollarSign,
  ClipboardCheck,
  Users,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";

interface DashboardStats {
  pendingCount: number;
  todayBags: number;
  todayRevenue: number;
  totalRevenue: number;
  totalBags: number;
  inventory: Record<string, { totalStock: number; remainingStock: number }>;
  lowStockWarnings: string[];
  userCount: number;
  userStats: Array<{
    id: string;
    name: string;
    username: string;
    stock: {
      totalInStock: number;
      assigned: { "42.5": number; "32.5": number };
      remaining: { "42.5": number; "32.5": number };
    };
    sales: {
      bagsSold: { "42.5": number; "32.5": number };
      amount: { "42.5": number; "32.5": number };
      totalAmount: number;
    };
    expenses: {
      amount: { "42.5": number; "32.5": number };
      totalAmount: number;
    };
    net: {
      amount: { "42.5": number; "32.5": number };
      totalAmount: number;
    };
  }>;
  recentTransactions: Array<{
    id: string;
    seller: { name: string; username: string } | null;
    cementType: string;
    bagsSold: number;
    totalAmount: number;
    status: "Pending" | "Approved" | "Rejected";
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/stats/dashboard");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Low Stock Warnings */}
      {stats.lowStockWarnings.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium text-warning-foreground">
                Low Stock Warning
              </p>
              <p className="text-sm text-muted-foreground">
                Cement types {stats.lowStockWarnings.join(", ")} have less than
                100 bags remaining
              </p>
            </div>
            <Button asChild variant="outline" className="ml-auto">
              <Link href="/admin/inventory">Manage Inventory</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Approvals"
          value={stats.pendingCount}
          icon={ClipboardCheck}
          description="Awaiting your review"
          variant={stats.pendingCount > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Today's Sales"
          value={`${stats.todayBags} bags`}
          icon={Package}
          description={formatCurrency(stats.todayRevenue)}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          description={`${stats.totalBags} bags sold total`}
          variant="success"
        />
        <StatCard
          title="Active Sellers"
          value={stats.userCount}
          icon={Users}
          description="Registered users"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            Seller Breakdown
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/users">Manage Users</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.userStats.map((user) => (
              <Card key={user.id} className="bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {user.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    @{user.username}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                    <span className="text-sm text-muted-foreground">
                      Total In Stock
                    </span>
                    <span className="font-semibold">
                      {user.stock.totalInStock} bags
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-background">
                      <span className="text-xs text-muted-foreground">
                        Cement 42.5
                      </span>
                      <span className="text-sm font-semibold">
                        Sold: {user.sales.bagsSold["42.5"]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Amount: {formatCurrency(user.sales.amount["42.5"])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Expenses: {formatCurrency(user.expenses.amount["42.5"])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Net: {formatCurrency(user.net.amount["42.5"])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {user.stock.remaining["42.5"]} /{" "}
                        {user.stock.assigned["42.5"]}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-background">
                      <span className="text-xs text-muted-foreground">
                        Cement 32.5
                      </span>
                      <span className="text-sm font-semibold">
                        Sold: {user.sales.bagsSold["32.5"]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Amount: {formatCurrency(user.sales.amount["32.5"])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Expenses: {formatCurrency(user.expenses.amount["32.5"])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Net: {formatCurrency(user.net.amount["32.5"])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {user.stock.remaining["32.5"]} /{" "}
                        {user.stock.assigned["32.5"]}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                      <span className="text-sm text-muted-foreground">
                        Total Sales
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(user.sales.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                      <span className="text-sm text-muted-foreground">
                        Total Expenses
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(user.expenses.totalAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                    <span className="text-sm text-muted-foreground">
                      Net Amount
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(user.net.totalAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {stats.userStats.length === 0 && (
              <div className="text-sm text-muted-foreground py-8">
                No sellers found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              Inventory Status
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/inventory">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {Object.entries(stats.inventory).map(([type, inv]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Cement {type}</p>
                      <p className="text-sm text-muted-foreground">
                        {inv.remainingStock} / {inv.totalStock} bags
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${inv.remainingStock < 100 ? "text-destructive" : "text-accent"}`}
                    >
                      {inv.remainingStock} remaining
                    </p>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${inv.remainingStock < 100 ? "bg-destructive" : "bg-accent"}`}
                        style={{
                          width: `${inv.totalStock > 0 ? (inv.remainingStock / inv.totalStock) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(stats.inventory).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No inventory data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Quick Stats</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  Approval Rate
                </span>
                <span className="font-semibold">
                  {stats.totalBags > 0
                    ? "Active"
                    : "No sales yet"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  Avg. Transaction
                </span>
                <span className="font-semibold">
                  {stats.recentTransactions.length > 0
                    ? formatCurrency(
                        stats.recentTransactions.reduce(
                          (sum, t) => sum + t.totalAmount,
                          0
                        ) / stats.recentTransactions.length
                      )
                    : "$0.00"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  Today{"'"}s Orders
                </span>
                <span className="font-semibold">
                  {
                    stats.recentTransactions.filter(
                      (t) =>
                        new Date(t.createdAt).toDateString() ===
                        new Date().toDateString()
                    ).length
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            Recent Transactions
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/approvals">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Cement Type</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {transaction.seller?.name || "Unknown"}
                    </TableCell>
                    <TableCell>Cement {transaction.cementType}</TableCell>
                    <TableCell className="text-right">
                      {transaction.bagsSold}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transaction.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(transaction.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
