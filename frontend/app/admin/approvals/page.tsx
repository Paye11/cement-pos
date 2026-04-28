"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

interface Transaction {
  id: string;
  seller: { name: string; username: string } | null;
  cementType: string;
  bagsSold: number;
  pricePerBag: number;
  totalAmount: number;
  status: "Pending" | "Approved" | "Rejected";
  isAdvancePayment: boolean;
  isNegotiatedPrice: boolean;
  originalPricePerBag?: number;
  createdAt: string;
}

interface ExpenseRequest {
  id: string;
  seller: { name: string; username: string } | null;
  cementType: "42.5" | "32.5";
  amount: number;
  note?: string;
  status: "Pending" | "Approved" | "Rejected";
  requestedAt?: string;
  createdAt: string;
}

export default function ApprovalsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    transactionId: string | null;
  }>({ open: false, transactionId: null });
  const [rejectReason, setRejectReason] = useState("");
  const [expenseRejectDialog, setExpenseRejectDialog] = useState<{
    open: boolean;
    expenseId: string | null;
  }>({ open: false, expenseId: null });
  const [expenseRejectReason, setExpenseRejectReason] = useState("");

  const fetchData = async () => {
    try {
      const [transactionsRes, expensesRes] = await Promise.all([
        fetch("/api/transactions?status=Pending", { cache: "no-store" }),
        fetch("/api/expenses?limit=200", { cache: "no-store" }),
      ]);

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions);
      } else {
        const data = await transactionsRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to load pending transactions");
      }

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        const allExpenses = (data.expenses || []) as ExpenseRequest[];
        setExpenseRequests(allExpenses.filter((e) => e.status === "Pending"));
      } else {
        const data = await expensesRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to load pending expense requests");
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load pending approvals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingKey(`t:${id}`);
    try {
      const response = await fetch(`/api/transactions/${id}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Transaction approved successfully");
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve transaction");
      }
    } catch {
      toast.error("Failed to approve transaction");
    } finally {
      setProcessingKey(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.transactionId) return;

    setProcessingKey(`t:${rejectDialog.transactionId}`);
    try {
      const response = await fetch(
        `/api/transactions/${rejectDialog.transactionId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );

      if (response.ok) {
        toast.success("Transaction rejected");
        setTransactions((prev) =>
          prev.filter((t) => t.id !== rejectDialog.transactionId)
        );
        setRejectDialog({ open: false, transactionId: null });
        setRejectReason("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to reject transaction");
      }
    } catch {
      toast.error("Failed to reject transaction");
    } finally {
      setProcessingKey(null);
    }
  };

  const handleApproveExpense = async (id: string) => {
    setProcessingKey(`e:${id}`);
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success("Expense approved successfully");
        setExpenseRequests((prev) => prev.filter((e) => e.id !== id));
      } else {
        toast.error(data.error || "Failed to approve expense");
      }
    } catch {
      toast.error("Failed to approve expense");
    } finally {
      setProcessingKey(null);
    }
  };

  const handleRejectExpense = async () => {
    if (!expenseRejectDialog.expenseId) return;

    setProcessingKey(`e:${expenseRejectDialog.expenseId}`);
    try {
      const response = await fetch(`/api/expenses/${expenseRejectDialog.expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: expenseRejectReason }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success("Expense rejected");
        setExpenseRequests((prev) => prev.filter((e) => e.id !== expenseRejectDialog.expenseId));
        setExpenseRejectDialog({ open: false, expenseId: null });
        setExpenseRejectReason("");
      } else {
        toast.error(data.error || "Failed to reject expense");
      }
    } catch {
      toast.error("Failed to reject expense");
    } finally {
      setProcessingKey(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Transaction Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Cement Type</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead className="text-right">Price/Bag</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {transaction.seller?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{transaction.seller?.username || "unknown"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>Cement {transaction.cementType}</span>
                        {transaction.isAdvancePayment && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded w-fit">
                            Advance Payment
                          </span>
                        )}
                        {transaction.isNegotiatedPrice && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded w-fit">
                            Negotiated Price
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.bagsSold}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(transaction.pricePerBag)}</span>
                        {transaction.isNegotiatedPrice && transaction.originalPricePerBag && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            {formatCurrency(transaction.originalPricePerBag)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transaction.totalAmount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(transaction.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(transaction.id)}
                          disabled={processingKey === `t:${transaction.id}`}
                          className="bg-accent hover:bg-accent/90"
                        >
                          {processingKey === `t:${transaction.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span className="ml-1">Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setRejectDialog({
                              open: true,
                              transactionId: transaction.id,
                            })
                          }
                          disabled={processingKey === `t:${transaction.id}`}
                        >
                          <X className="h-4 w-4" />
                          <span className="ml-1">Reject</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-medium mb-1">All caught up!</h3>
              <p className="text-muted-foreground">
                No pending transactions to review
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Expense Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Cement Type</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseRequests.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {expense.seller?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{expense.seller?.username || "unknown"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">Cement {expense.cementType}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.note || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(expense.requestedAt || expense.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveExpense(expense.id)}
                          disabled={processingKey === `e:${expense.id}`}
                          className="bg-accent hover:bg-accent/90"
                        >
                          {processingKey === `e:${expense.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span className="ml-1">Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setExpenseRejectDialog({
                              open: true,
                              expenseId: expense.id,
                            })
                          }
                          disabled={processingKey === `e:${expense.id}`}
                        >
                          <X className="h-4 w-4" />
                          <span className="ml-1">Reject</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-medium mb-1">All caught up!</h3>
              <p className="text-muted-foreground">No pending expense requests to review</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          setRejectDialog({ open, transactionId: null });
          setRejectReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transaction. This will
              be visible to the seller.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, transactionId: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingKey !== null}
            >
              {processingKey ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={expenseRejectDialog.open}
        onOpenChange={(open) => {
          setExpenseRejectDialog({ open, expenseId: null });
          setExpenseRejectReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this expense request. This will be visible to the
              seller.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="expense-reason">Reason (optional)</Label>
            <Textarea
              id="expense-reason"
              placeholder="Enter rejection reason..."
              value={expenseRejectReason}
              onChange={(e) => setExpenseRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExpenseRejectDialog({ open: false, expenseId: null })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectExpense} disabled={processingKey !== null}>
              {processingKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
