"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DollarSign, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  username: string;
}

interface ExpenseItem {
  id: string;
  cementType: "42.5" | "32.5";
  amount: number;
  note?: string;
  status: "Pending" | "Approved" | "Rejected";
  requestedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface ExpenseSummary {
  sales: { "42.5": number; "32.5": number };
  expenses: { "42.5": number; "32.5": number };
  remaining: { "42.5": number; "32.5": number };
}

function ExpensesHistoryFallback() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpensesHistoryInner() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; expenseId: string | null }>({
    open: false,
    expenseId: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedUser = useMemo(() => users.find((u) => u.id === userId) ?? null, [users, userId]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to load sellers");
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load sellers");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchExpenses = async (sellerId: string) => {
    setIsLoadingExpenses(true);
    try {
      const params = new URLSearchParams({ userId: sellerId, limit: "200" });
      const res = await fetch(`/api/expenses?${params.toString()}`, { cache: "no-store" });
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
      setIsLoadingExpenses(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchExpenses(userId);
    } else {
      setExpenses([]);
      setSummary(null);
    }
  }, [userId]);

  const handleDeleteExpense = async () => {
    if (!deleteDialog.expenseId || !userId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${deleteDialog.expenseId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to delete expense");
        return;
      }
      toast.success("Expense deleted");
      setDeleteDialog({ open: false, expenseId: null });
      await fetchExpenses(userId);
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast.error("Failed to delete expense");
    } finally {
      setIsDeleting(false);
    }
  };

  const totals = useMemo(() => {
    const approvedTotal = expenses
      .filter((e) => e.status === "Approved")
      .reduce((sum, e) => sum + e.amount, 0);
    const pendingTotal = expenses
      .filter((e) => e.status === "Pending")
      .reduce((sum, e) => sum + e.amount, 0);
    return { approvedTotal, pendingTotal };
  }, [expenses]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Expenses History
            </CardTitle>
            <CardDescription>
              Browse each seller&apos;s expenses. Deleting an approved expense restores the seller&apos;s available
              balance.
            </CardDescription>
          </div>
          {userId ? (
            <Button asChild variant="outline">
              <Link href="/admin/expenses-history">Clear Filter</Link>
            </Button>
          ) : null}
        </CardHeader>
        {userId ? (
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Filtered</Badge>
              <span className="text-sm text-muted-foreground">
                Showing expenses for {selectedUser?.name || "selected seller"}
              </span>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Sellers</CardTitle>
          <CardDescription>Select a seller to view their expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex flex-col gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={u.id === userId ? "bg-muted/30" : undefined}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">@{u.username}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/expenses-history?userId=${u.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No sellers found.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Expenses</CardTitle>
          <CardDescription>
            {userId ? "All expenses for the selected seller." : "Pick a seller above to view expenses."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!userId ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Select a seller to see expense history.
            </p>
          ) : isLoadingExpenses ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Available (Cement 42.5)</span>
                  <div className="font-semibold">{formatCurrency(summary?.remaining["42.5"] || 0)}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Available (Cement 32.5)</span>
                  <div className="font-semibold">{formatCurrency(summary?.remaining["32.5"] || 0)}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Approved Expenses</span>
                  <div className="font-semibold">{formatCurrency(totals.approvedTotal)}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Pending Requests</span>
                  <div className="font-semibold">{formatCurrency(totals.pendingTotal)}</div>
                </div>
              </div>

              {expenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Cement Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(e.requestedAt || e.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">Cement {e.cementType}</TableCell>
                        <TableCell>
                          <StatusBadge status={e.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.status === "Rejected" && e.rejectionReason
                            ? `${e.note || "-"} (Rejected: ${e.rejectionReason})`
                            : e.note || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                        <TableCell className="text-right">
                          {e.status === "Approved" ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteDialog({ open: true, expenseId: e.id })}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No expenses recorded for this seller.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, expenseId: open ? deleteDialog.expenseId : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the approved expense and restores the seller&apos;s available balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ExpensesHistoryPage() {
  return (
    <Suspense fallback={<ExpensesHistoryFallback />}>
      <ExpensesHistoryInner />
    </Suspense>
  );
}

