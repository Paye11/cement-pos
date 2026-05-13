"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { History, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

function HistoryPageFallback() {
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

function AdminHistoryPageInner() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [isLoading, setIsLoading] = useState(true);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [events, setEvents] = useState<TxEvent[]>([]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const stockParams = new URLSearchParams({ limit: "100" });
      const txParams = new URLSearchParams({ limit: "200" });
      if (userId) {
        stockParams.set("userId", userId);
        txParams.set("sellerId", userId);
      }
      const [stockRes, eventsRes] = await Promise.all([
        fetch(`/api/admin/history/stock?${stockParams.toString()}`),
        fetch(`/api/admin/history/transactions?${txParams.toString()}`),
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

  const downloadHistoryPDF = () => {
    const doc = new jsPDF();
    const userName = stockLogs[0]?.user?.name || events[0]?.seller?.name || "User";
    
    doc.setFontSize(18);
    doc.text("System History Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Target: ${userId ? userName : "All Sellers"}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    // Section 1: Stock Assignment
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("1. Stock Assignment History", 14, 48);
    
    const stockTableData = stockLogs.map(l => [
      formatDateTime(l.createdAt),
      l.user?.name || "Unknown",
      `Cement ${l.cementType}`,
      l.action.toUpperCase(),
      formatNumber(l.amount),
      l.performedBy?.name || "-"
    ]);

    autoTable(doc, {
      startY: 52,
      head: [["Date", "User", "Cement", "Action", "Amount", "By"]],
      body: stockTableData,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Section 2: Sales Events
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("2. Sales Transaction Events", 14, finalY);
    
    const txTableData = events.map(e => [
      formatDateTime(e.createdAt),
      e.seller?.name || "Unknown",
      e.eventType.toUpperCase(),
      `Cement ${e.cementType}`,
      formatNumber(e.bagsSold),
      formatCurrency(e.totalAmount),
      e.performedBy?.name || "-"
    ]);

    autoTable(doc, {
      startY: finalY + 4,
      head: [["Date", "Seller", "Event", "Cement", "Bags", "Amount", "By"]],
      body: txTableData,
      theme: "striped",
      headStyles: { fillColor: [39, 174, 96] },
    });

    doc.save(`History_Report_${new Date().getTime()}.pdf`);
  };

  const downloadSalesOnlyPDF = () => {
    const doc = new jsPDF();
    const userName = events[0]?.seller?.name || "User";
    
    doc.setFontSize(18);
    doc.text("Sales Transaction Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Target: ${userId ? userName : "All Sellers"}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    const txTableData = events.map(e => [
      formatDateTime(e.createdAt),
      e.seller?.name || "Unknown",
      e.eventType.toUpperCase(),
      `Cement ${e.cementType}`,
      formatNumber(e.bagsSold),
      formatCurrency(e.totalAmount),
      e.performedBy?.name || "-"
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["Date", "Seller", "Event", "Cement", "Bags", "Amount", "By"]],
      body: txTableData,
      theme: "striped",
      headStyles: { fillColor: [39, 174, 96] },
    });

    doc.save(`Sales_Report_${new Date().getTime()}.pdf`);
  };

  const downloadStockOnlyPDF = () => {
    const doc = new jsPDF();
    const userName = stockLogs[0]?.user?.name || "User";
    
    doc.setFontSize(18);
    doc.text("Stock Assignment Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Target: ${userId ? userName : "All Sellers"}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    const stockTableData = stockLogs.map(l => [
      formatDateTime(l.createdAt),
      l.user?.name || "Unknown",
      `Cement ${l.cementType}`,
      l.action.toUpperCase(),
      formatNumber(l.amount),
      l.performedBy?.name || "-"
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["Date", "User", "Cement", "Action", "Amount", "By"]],
      body: stockTableData,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`Stock_Report_${new Date().getTime()}.pdf`);
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
  }, [userId]);

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              History
            </CardTitle>
            <CardDescription>
              Tracks stock assignments to sellers and sales submission/approval events.
            </CardDescription>
          </div>
          {userId ? (
            <Button asChild variant="outline">
              <Link href="/admin/history">Clear Filter</Link>
            </Button>
          ) : null}
        </CardHeader>
        {userId ? (
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Filtered</Badge>
              <span className="text-sm text-muted-foreground">
                Showing history for one user
              </span>
            </div>
          </CardContent>
        ) : null}
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

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={downloadStockOnlyPDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Stock PDF
        </Button>
        <Button variant="outline" onClick={downloadSalesOnlyPDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Sales PDF
        </Button>
        <Button variant="outline" onClick={downloadHistoryPDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Full History PDF
        </Button>
        <Button variant="outline" onClick={fetchHistory}>
          Refresh
        </Button>
      </div>
    </div>
  );
}

export default function AdminHistoryPage() {
  return (
    <Suspense fallback={<HistoryPageFallback />}>
      <AdminHistoryPageInner />
    </Suspense>
  );
}

