"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

type PayrollType = "Seller" | "StoreBoy" | "Security";
type PayrollStatus = "Pending" | "Approved";

interface UserRef {
  id: string;
  name: string;
  username: string;
}

interface PayrollItem {
  id: string;
  user: UserRef | null;
  payrollType: PayrollType;
  amount: number;
  month: number;
  year: number;
  status: PayrollStatus;
  approvalDate?: string;
  createdAt: string;
}

const MONTHS: Array<{ value: string; label: string }> = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const DEFAULT_YEAR = new Date().getFullYear();

function monthLabel(month: number) {
  return MONTHS.find((m) => Number(m.value) === month)?.label || String(month);
}

export default function PayrollHistoryPage() {
  const [payroll, setPayroll] = useState<PayrollItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  const [filters, setFilters] = useState({
    year: String(DEFAULT_YEAR),
    month: "all",
    payrollType: "all",
    search: "",
  });

  const fetchPayroll = useCallback(async (year: string, month: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "Approved");
      params.set("limit", "500");
      if (year.trim()) params.set("year", year.trim());
      if (month !== "all") params.set("month", month);

      const res = await fetch(`/api/payroll?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to load payroll history");
        setPayroll([]);
        return;
      }
      const list: PayrollItem[] = (data.payroll || []).filter((p: PayrollItem) => p?.status === "Approved");
      setPayroll(list);
    } catch (error) {
      console.error("Fetch payroll history error:", error);
      toast.error("Failed to load payroll history");
      setPayroll([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayroll(String(DEFAULT_YEAR), "all");
  }, [fetchPayroll]);

  const applyFilters = async () => {
    setIsApplying(true);
    try {
      await fetchPayroll(filters.year, filters.month);
    } finally {
      setIsApplying(false);
    }
  };

  const filteredPayroll = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return payroll.filter((p) => {
      if (filters.payrollType !== "all" && p.payrollType !== filters.payrollType) return false;
      if (!q) return true;
      const name = p.user?.name?.toLowerCase() || "";
      const username = p.user?.username?.toLowerCase() || "";
      return name.includes(q) || username.includes(q);
    });
  }, [filters.payrollType, filters.search, payroll]);

  const groups = useMemo(() => {
    const byUser = new Map<
      string,
      { user: UserRef | null; records: PayrollItem[]; total: number }
    >();

    for (const p of filteredPayroll) {
      const key = p.user?.id || "unknown";
      const existing = byUser.get(key);
      if (!existing) {
        byUser.set(key, { user: p.user || null, records: [p], total: p.amount });
      } else {
        existing.records.push(p);
        existing.total += p.amount;
      }
    }

    const list = Array.from(byUser.values()).map((g) => ({
      ...g,
      records: g.records.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    }));

    list.sort((a, b) => (b.user?.name || "").localeCompare(a.user?.name || ""));
    return list;
  }, [filteredPayroll]);

  const totals = useMemo(() => {
    return {
      payees: groups.filter((g) => g.user).length,
      records: filteredPayroll.length,
      totalPaid: filteredPayroll.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [filteredPayroll, groups]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
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
            <DollarSign className="h-5 w-5" />
            Payroll History
          </CardTitle>
          <CardDescription>
            Review paid payroll grouped by payee. Shows month and salary amount.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalPaid)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Payees</p>
              <p className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {totals.payees}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Paid Records</p>
              <p className="text-lg font-semibold">{totals.records}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label>Year</Label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={filters.year}
                onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Month</Label>
              <Select value={filters.month} onValueChange={(v) => setFilters((p) => ({ ...p, month: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select
                value={filters.payrollType}
                onValueChange={(v) => setFilters((p) => ({ ...p, payrollType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Seller">Seller Salary</SelectItem>
                  <SelectItem value="StoreBoy">Store Boy Salary</SelectItem>
                  <SelectItem value="Security">Security Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Search Payee</Label>
              <Input
                placeholder="Name or username"
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4">
              <Button
                onClick={applyFilters}
                disabled={isApplying}
                type="button"
              >
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {groups.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <Card key={g.user?.id || "unknown"}>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  {g.user?.name || "Unknown Payee"}
                </CardTitle>
                <CardDescription>
                  @{g.user?.username || "-"} • Total Paid: {formatCurrency(g.total)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Salary</TableHead>
                      <TableHead>Paid Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.records.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{monthLabel(p.month)}</TableCell>
                        <TableCell>{p.year}</TableCell>
                        <TableCell>
                          {p.payrollType === "Seller"
                            ? "Seller Salary"
                            : p.payrollType === "StoreBoy"
                              ? "Store Boy Salary"
                              : "Security Salary"}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(p.approvalDate || p.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No paid payroll records found for the selected filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

