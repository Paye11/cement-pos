"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

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

interface UserExpenseManagementProps {
  userId: string;
  userName: string;
}

export function UserExpenseManagement({ userId, userName }: UserExpenseManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/expenses?userId=${userId}&limit=50`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to load expenses");
        return;
      }
      const data = await res.json();
      setExpenses(data.expenses || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExpenses();
    }
  }, [isOpen, userId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View Expenses
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Expenses for {userName}</DialogTitle>
          <DialogDescription>
            Expenses are deducted from this seller&apos;s approved sales per cement type.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Cement 42.5</span>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sales</span>
                  <span className="font-semibold">{formatCurrency(summary?.sales["42.5"] || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expenses</span>
                  <span className="font-semibold">{formatCurrency(summary?.expenses["42.5"] || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net</span>
                  <span className="font-semibold">{formatCurrency(summary?.remaining["42.5"] || 0)}</span>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Cement 32.5</span>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sales</span>
                  <span className="font-semibold">{formatCurrency(summary?.sales["32.5"] || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expenses</span>
                  <span className="font-semibold">{formatCurrency(summary?.expenses["32.5"] || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net</span>
                  <span className="font-semibold">{formatCurrency(summary?.remaining["32.5"] || 0)}</span>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Totals</span>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sales</span>
                  <span className="font-semibold">
                    {formatCurrency((summary?.sales["42.5"] || 0) + (summary?.sales["32.5"] || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expenses</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      (summary?.expenses["42.5"] || 0) + (summary?.expenses["32.5"] || 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      (summary?.remaining["42.5"] || 0) + (summary?.remaining["32.5"] || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

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
                      <TableCell className="text-muted-foreground">{item.note || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No expenses recorded for this seller.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

