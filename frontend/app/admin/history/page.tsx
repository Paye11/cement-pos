"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";

interface StockLog {
  id: string;
  user: { id: string; name: string; username: string } | null;
  cementType: "42.5" | "32.5";
  action: "add" | "remove";
  amount: number;
  performedBy: { name: string } | null;
  createdAt: string;
}

interface TxEvent {
  id: string;
  transactionId: string;
  seller: { id: string; name: string; username: string } | null;
  cementType: "42.5" | "32.5";
  bagsSold: number;
  totalAmount: number;
  eventType: "Submitted" | "Approved" | "Rejected";
  performedBy: { name: string } | null;
  rejectionReason?: string;
  createdAt: string;
}

export default function AdminHistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [events, setEvents] = useState<TxEvent[]>([]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const [stockRes, eventsRes] = await Promise.all([
        fetch("/api/admin/history/stock?limit=100"),
        fetch("/api/admin/history/transactions?limit=200"),
      ]);

      if (stockRes.ok) {
        const data = await stockRes.json();
        setStockLogs(data.logs || []);
      } else {
        const data = await stockRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to load stock history");
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      } else {
        const data = await eventsRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to load transaction history");
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
      toast.error("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  const renderEventBadge = (eventType: TxEvent["eventType"]) => {
    if (eventType === "Submitted") {
      return (
        <Badge
          variant="outline"
          className="font-medium bg-warning/15 text-warning-foreground border-warning/30 hover:bg-warning/20"
        >
          Submitted
        </Badge>
      );
    }
    if (eventType === "Approved") {
      return (
        <Badge
          variant="outline"
          className="font-medium bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
        >
          Approved
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="font-medium bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
      >
        Rejected
      </Badge>
    );
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            History
          </CardTitle>
          <CardDescription>
            Tracks stock assignments to sellers and sales submission/approval events.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Stock Assignment History</CardTitle>
          <CardDescription>
            Records each time admin adds/removes Cement 42.5 or 32.5 from a user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Cement</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Amount (bags)</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(l.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {l.user?.name || "Unknown"}
                      <div className="text-xs text-muted-foreground">@{l.user?.username || "-"}</div>
                    </TableCell>
                    <TableCell>Cement {l.cementType}</TableCell>
                    <TableCell className="capitalize">{l.action}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(l.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.performedBy?.name || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">
              No stock assignment history yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Sales Transaction History</CardTitle>
          <CardDescription>
            Records sales submission by users and admin approval/rejection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Cement</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(e.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {e.seller?.name || "Unknown"}
                      <div className="text-xs text-muted-foreground">@{e.seller?.username || "-"}</div>
                    </TableCell>
                    <TableCell>
                      {renderEventBadge(e.eventType)}
                    </TableCell>
                    <TableCell>Cement {e.cementType}</TableCell>
                    <TableCell className="text-right">{formatNumber(e.bagsSold)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(e.totalAmount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.performedBy?.name || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">
              No transaction history yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchHistory}>
          Refresh
        </Button>
      </div>
    </div>
  );
}

