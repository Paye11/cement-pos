"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";

interface Seller {
  id: string;
  name: string;
  username: string;
  role: "admin" | "user";
}

interface ReportRow {
  id: string;
  seller: { id: string; name: string; username: string } | null;
  reportDate: string;
  submittedAt: string;
  totalBags: number;
  totalRevenue: number;
  advancePaymentsCount: number;
  advancePaymentsAmount: number;
  isLate: boolean;
  lateByMinutes: number;
}

export default function AdminDailyReportsPage() {
  const [users, setUsers] = useState<Seller[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    sellerId: "all",
    startDate: "",
    endDate: "",
    lateOnly: false,
  });
  const [isApplying, setIsApplying] = useState(false);

  const sellerOptions = useMemo(() => users.filter((u) => u.role === "user"), [users]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setUsers(data.users || []);
    } catch {
    }
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (filters.sellerId !== "all") params.set("sellerId", filters.sellerId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.lateOnly) params.set("lateOnly", "1");

      const res = await fetch(`/api/daily-reports?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to load reports");
        return;
      }
      setReports(data.reports || []);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchReports();
  }, []);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await fetchReports();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Reports</CardTitle>
          <CardDescription>Late submissions are highlighted in red.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label>Seller</Label>
              <Select value={filters.sellerId} onValueChange={(v) => setFilters((p) => ({ ...p, sellerId: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sellers</SelectItem>
                  {sellerOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <Input type="date" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Input type="date" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={filters.lateOnly} onCheckedChange={(checked) => setFilters((p) => ({ ...p, lateOnly: checked }))} />
                <span className="text-sm">Late only</span>
              </div>
              <Button onClick={handleApply} disabled={isApplying}>
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Applying...
                  </>
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <span>
              Reports are not required on Sundays and configured Liberia holidays.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Advance</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id} className={r.isLate ? "text-destructive" : ""}>
                    <TableCell>{formatDate(r.reportDate)}</TableCell>
                    <TableCell className="font-medium">
                      {r.seller ? `${r.seller.name} (${r.seller.username})` : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(r.submittedAt)}</TableCell>
                    <TableCell className="text-right">{formatNumber(r.totalBags)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalRevenue)}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(r.advancePaymentsCount)} • {formatCurrency(r.advancePaymentsAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.isLate ? (
                        <Badge variant="destructive">Late</Badge>
                      ) : (
                        <Badge variant="outline">On time</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

