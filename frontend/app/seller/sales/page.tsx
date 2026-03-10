"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Filter } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

interface Transaction {
  id: string;
  cementType: string;
  bagsSold: number;
  pricePerBag: number;
  totalAmount: number;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
  createdAt: string;
}

export default function SalesHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchTransactions = async () => {
    try {
      const url =
        statusFilter === "all"
          ? "/api/transactions"
          : `/api/transactions?status=${statusFilter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load sales history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const stats = {
    total: transactions.length,
    pending: transactions.filter((t) => t.status === "Pending").length,
    approved: transactions.filter((t) => t.status === "Approved").length,
    rejected: transactions.filter((t) => t.status === "Rejected").length,
    totalRevenue: transactions
      .filter((t) => t.status === "Approved")
      .reduce((sum, t) => sum + t.totalAmount, 0),
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
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
    <div className="flex flex-col gap-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-semibold text-warning-foreground">
              {stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-semibold text-accent">
              {stats.approved}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Sales</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button asChild>
              <Link href="/seller/new-sale">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Sale
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Cement Type</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead className="text-right">Price/Bag</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(transaction.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      Cement {transaction.cementType}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.bagsSold}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transaction.pricePerBag)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transaction.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {transaction.status === "Rejected" &&
                      transaction.rejectionReason ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <StatusBadge status={transaction.status} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">
                                Reason: {transaction.rejectionReason}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <StatusBadge status={transaction.status} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {statusFilter === "all"
                  ? "No sales recorded yet"
                  : `No ${statusFilter.toLowerCase()} sales found`}
              </p>
              <Button asChild>
                <Link href="/seller/new-sale">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Make Your First Sale
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
