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

export default function ApprovalsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    transactionId: string | null;
  }>({ open: false, transactionId: null });
  const [rejectReason, setRejectReason] = useState("");

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions?status=Pending");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load pending approvals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
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
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.transactionId) return;

    setProcessingId(rejectDialog.transactionId);
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
      setProcessingId(null);
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
          <CardTitle>Pending Approvals</CardTitle>
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
                          disabled={processingId === transaction.id}
                          className="bg-accent hover:bg-accent/90"
                        >
                          {processingId === transaction.id ? (
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
                          disabled={processingId === transaction.id}
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
              disabled={processingId !== null}
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
