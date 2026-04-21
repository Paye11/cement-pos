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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

interface DashboardStats {
  pendingCount: number;
  waitingForDeliveryCount: number;
  approvedCount: number;
  rejectedCount: number;
  todayBags: number;
  todayRevenue: number;
  inventory: Array<{
    cementType: string;
    totalAssigned: number;
    remainingStock: number;
  }>;
  recentTransactions: Array<{
    id: string;
    cementType: string;
    bagsSold: number;
    totalAmount: number;
    status: "Pending" | "Approved" | "Rejected" | "Waiting for Delivery";
    createdAt: string;
    rejectionReason?: string;
  }>;
  expenses?: {
    amount: { "42.5": number; "32.5": number };
    totalAmount: number;
  };
  net?: {
    amount: { "42.5": number; "32.5": number };
    totalAmount: number;
  };
}

interface Price {
  cementType: string;
  pricePerBag: number;
}

interface ExpenseItem {
  id: string;
  cementType: "42.5" | "32.5";
  amount: number;
  note?: string;
  createdAt: string;
}

interface ExpenseSummary {
  sales: { "42.5": number; "32.5": number };
  expenses: { "42.5": number; "32.5": number };
  remaining: { "42.5": number; "32.5": number };
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    cementType: "42.5" as "42.5" | "32.5",
    amountDollars: "",
    note: "",
  });
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, pricesRes, expensesRes] = await Promise.all([
          fetch("/api/stats/dashboard"),
          fetch("/api/prices"),
          fetch("/api/expenses?limit=10"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          setPrices(pricesData.prices);
        }

        if (expensesRes.ok) {
          const expensesData = await expensesRes.json();
          setExpenses(expensesData.expenses || []);
          setExpenseSummary(expensesData.summary || null);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const refreshExpenses = async () => {
    const res = await fetch("/api/expenses?limit=10");
    if (!res.ok) return;
    const data = await res.json();
    setExpenses(data.expenses || []);
    setExpenseSummary(data.summary || null);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNumber = Number(expenseForm.amountDollars);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      toast.error("Enter a valid expense amount");
      return;
    }

    const amountCents = Math.round(amountNumber * 100);
    if (amountCents < 1) {
      toast.error("Enter a valid expense amount");
      return;
    }

    setIsSavingExpense(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cementType: expenseForm.cementType,
          amount: amountCents,
          note: expenseForm.note,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to save expense");
        return;
      }

      toast.success("Expense recorded");
      setExpenseForm((prev) => ({ ...prev, amountDollars: "", note: "" }));
      setExpenseSummary(data.summary || null);
      await refreshExpenses();
      const statsRes = await fetch("/api/stats/dashboard");
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch {
      toast.error("Failed to save expense");
    } finally {
      setIsSavingExpense(false);
    }
  };

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Pending Approval"
          value={stats.pendingCount}
          icon={ClipboardCheck}
          description="Awaiting admin review"
          variant={stats.pendingCount > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Waiting Delivery"
          value={stats.waitingForDeliveryCount}
          icon={Package}
          description="Paid but not collected"
        />
        <StatCard
          title="Approved Sales"
          value={stats.approvedCount}
          icon={CheckCircle}
          description="Successfully completed"
          variant="success"
        />
        <StatCard
          title="Rejected Sales"
          value={stats.rejectedCount}
          icon={XCircle}
          description="Needs your attention"
          variant={stats.rejectedCount > 0 ? "destructive" : "default"}
        />
        <StatCard
          title="Today's Sales"
          value={`${stats.todayBags} bags`}
          icon={PlusCircle}
          description={formatCurrency(stats.todayRevenue)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Expenses</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Available (Cement 42.5)</p>
              <p className="text-lg font-semibold">
                {formatCurrency(expenseSummary?.remaining["42.5"] || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Available (Cement 32.5)</p>
              <p className="text-lg font-semibold">
                {formatCurrency(expenseSummary?.remaining["32.5"] || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Total Net</p>
              <p className="text-lg font-semibold">
                {formatCurrency(stats.net?.totalAmount || 0)}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateExpense} className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label>Cement Type</Label>
              <Select
                value={expenseForm.cementType}
                onValueChange={(value) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    cementType: value as "42.5" | "32.5",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="42.5">Cement 42.5</SelectItem>
                  <SelectItem value="32.5">Cement 32.5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={expenseForm.amountDollars}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, amountDollars: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={expenseForm.note}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>

            <div className="md:col-span-4">
              <Button type="submit" disabled={isSavingExpense}>
                {isSavingExpense ? "Saving..." : "Add Expense"}
              </Button>
            </div>
          </form>

          <div>
            <p className="text-sm font-medium mb-3">Recent Expenses</p>
            {expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Cement Type</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">Cement {item.cementType}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.note || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No expenses recorded yet</p>
            )}
          </div>
        </CardContent>
      </Card>

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
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
