"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ByType = { cementType: "32.5" | "42.5"; bags: number; revenue: number };

interface PreviewResponse {
  date: string;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  isWorkingDay: boolean;
  wouldBeLate: boolean;
  totals: {
    totalBags: number;
    totalRevenue: number;
    byCementType: ByType[];
    advancePaymentsCount: number;
    advancePaymentsAmount: number;
  };
}

interface DailyReportRow {
  id: string;
  reportDate: string;
  submittedAt: string;
  totalBags: number;
  totalRevenue: number;
  advancePaymentsCount: number;
  advancePaymentsAmount: number;
  isLate: boolean;
  lateByMinutes: number;
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SellerDailyReportsPage() {
  const [date, setDate] = useState(() => todayYmd());
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reports, setReports] = useState<DailyReportRow[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch("/api/daily-reports?limit=60", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to load submissions");
        return;
      }
      setReports(data.reports || []);
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setIsLoadingReports(false);
    }
  };

  const fetchPreview = async (ymd: string) => {
    if (!ymd) return;
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/daily-reports/preview?date=${encodeURIComponent(ymd)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to load preview");
        setPreview(null);
        return;
      }
      setPreview(data);
    } catch {
      toast.error("Failed to load preview");
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    fetchPreview(date);
  }, [date]);

  const blockedReason = useMemo(() => {
    if (!preview) return null;
    if (preview.isSunday) return "Sunday is not counted for daily sales";
    if (preview.isHoliday) return `Holiday is not counted for daily sales: ${preview.holidayName || "Holiday"}`;
    return null;
  }, [preview]);

  const showLateWarning = useMemo(() => {
    if (!preview) return false;
    if (!preview.isWorkingDay) return false;
    return preview.wouldBeLate;
  }, [preview]);

  const handleSubmit = async () => {
    if (!date) return;
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to submit");
        return;
      }
      toast.success(data.report?.isLate ? "Submitted (Late)" : "Submitted");
      await fetchReports();
    } catch {
      toast.error("Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Report</CardTitle>
          <CardDescription>
            Submit your daily sales summary. Sundays and Liberia holidays are not counted.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 max-w-sm">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {isLoadingPreview ? (
            <div className="grid gap-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : preview ? (
            <div className="grid gap-4">
              {blockedReason ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <span>{blockedReason}</span>
                </div>
              ) : null}

              {showLateWarning ? (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-warning-foreground" />
                  <span className="text-warning-foreground">
                    This submission will be marked late (submitted after the report day).
                  </span>
                </div>
              ) : null}

              <div className="grid gap-3 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Bags</span>
                  <span className="font-semibold">{formatNumber(preview.totals.totalBags)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="font-semibold">{formatCurrency(preview.totals.totalRevenue)}</span>
                </div>
                <div className="grid gap-2 pt-2 border-t">
                  {preview.totals.byCementType.map((row) => (
                    <div key={row.cementType} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cement {row.cementType}</span>
                      <span>
                        {formatNumber(row.bags)} bags • {formatCurrency(row.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="grid gap-1 pt-2 border-t text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Advance Payments</span>
                    <span>
                      {formatNumber(preview.totals.advancePaymentsCount)} •{" "}
                      {formatCurrency(preview.totals.advancePaymentsAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={isSubmitting || !!blockedReason}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Daily Report"
                )}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No preview available.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">My Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingReports ? (
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
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
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(r.submittedAt)}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(r.totalBags)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalRevenue)}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(r.advancePaymentsCount)} •{" "}
                      {formatCurrency(r.advancePaymentsAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.isLate ? (
                        <Badge variant="destructive">
                          Late
                        </Badge>
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

