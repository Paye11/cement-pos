"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  PlusCircle,
  DollarSign,
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
  approvedCount: number;
  rejectedCount: number;
  todayBags: number;
  todayRevenue: number;
  inventory: {
    "42.5": { assigned: number; remaining: number };
    "32.5": { assigned: number; remaining: number };
  };
  recentTransactions: Array<{
    id: string;
    cementType: string;
    bagsSold: number;
    totalAmount: number;
    status: "Pending" | "Approved" | "Rejected";
    createdAt: string;
    rejectionReason?: string;
  }>;
}

interface Price {
  cementType: string;
  pricePerBag: number;
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, pricesRes] = await Promise.all([
          fetch("/api/stats/dashboard"),
          fetch("/api/prices"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          setPrices(pricesData.prices);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
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
      {/* Quick Action */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <h3 className="font-semibold">Ready to make a sale?</h3>
            <p className="text-sm text-muted-foreground">
              Record a new transaction quickly
            </p>
          </div>
          <Button asChild>
            <Link href="/seller/new-sale">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Sale
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Inventory 42.5"
          value={stats.inventory["42.5"].remaining}
          icon={Package}
          description={`of ${stats.inventory["42.5"].assigned} assigned`}
        />
        <StatCard
          title="Inventory 32.5"
          value={stats.inventory["32.5"].remaining}
          icon={Package}
          description={`of ${stats.inventory["32.5"].assigned} assigned`}
        />
        <StatCard
          title="Today&apos;s Revenue"
          value={formatCurrency(stats.todayRevenue)}
          icon={DollarSign}
          description={`${stats.todayBags} bags sold today`}
        />
        <StatCard
          title="Pending"
          value={stats.pendingCount}
          icon={ClipboardCheck}
          description="Awaiting approval"
          variant={stats.pendingCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* Prices and Recent Sales */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Current Prices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {prices.map((price) => (
                <div
                  key={price.cementType}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">
                      Cement {price.cementType}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-primary">
                    {formatCurrency(price.pricePerBag)}
                  </span>
                </div>
              ))}
              {prices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No prices available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Your Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  Total Sales
                </span>
                <span className="font-semibold">
                  {stats.pendingCount + stats.approvedCount + stats.rejectedCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  Approval Rate
                </span>
                <span className="font-semibold">
                  {stats.approvedCount + stats.rejectedCount > 0
                    ? `${Math.round((stats.approvedCount / (stats.approvedCount + stats.rejectedCount)) * 100)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  Today{"'"}s Sales
                </span>
                <span className="font-semibold">{stats.todayBags} bags</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            Recent Sales
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/seller/sales">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
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
                      Cement {transaction.cementType}
                    </TableCell>
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No sales recorded yet</p>
              <Button asChild className="mt-4">
                <Link href="/seller/new-sale">Make Your First Sale</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
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
    </div>
  );
}
