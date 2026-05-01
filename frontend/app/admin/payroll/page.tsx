"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DollarSign, Loader2, Plus } from "lucide-react";
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
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

type PayrollType = "Seller" | "StoreBoy" | "Security";
type PayrollStatus = "Pending" | "Approved" | "Rejected";

interface User {
  id: string;
  name: string;
  username: string;
}

interface PayrollItem {
  id: string;
  user: User | null;
  payrollType: PayrollType;
  amount: number;
  month: number;
  year: number;
  status: PayrollStatus;
  approvedBy?: { name: string } | null;
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

export default function PayrollPage() {
  const now = new Date();
  const [users, setUsers] = useState<User[]>([]);
  const [payroll, setPayroll] = useState<PayrollItem[]>([]);
  const [paidPreview, setPaidPreview] = useState<PayrollItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [filters, setFilters] = useState({
    month: "all",
    year: String(now.getFullYear()),
    status: "all",
  });

  const [form, setForm] = useState({
    userId: "",
    payrollType: "Seller" as PayrollType,
    amountDollars: "",
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  });

  const monthLabel = useMemo(() => {
    if (filters.month === "all") return "All Months";
    return MONTHS.find((m) => m.value === filters.month)?.label || "Month";
  }, [filters.month]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.month && filters.month !== "all") params.append("month", filters.month);
      if (filters.year) params.append("year", filters.year);
      if (filters.status !== "all") params.append("status", filters.status);

      const [usersRes, payrollRes] = await Promise.all([
        fetch("/api/users"),
        fetch(`/api/payroll?${params.toString()}`),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        const list: User[] = (data.users || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username,
        }));
        setUsers(list);
        if (list.length > 0) {
          setForm((p) => (p.userId ? p : { ...p, userId: list[0].id }));
        }
      }

      if (payrollRes.ok) {
        const data = await payrollRes.json();
        setPayroll(data.payroll || []);
      }
    } catch (error) {
      console.error("Failed to fetch payroll:", error);
      toast.error("Failed to load payroll");
    } finally {
      setIsLoading(false);
    }
  }, [filters.month, filters.status, filters.year]);

  const fetchPaidPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch("/api/payroll?status=Approved&limit=10");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPaidPreview([]);
        return;
      }
      setPaidPreview((data.payroll || []).slice(0, 10));
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPaidPreview();
  }, [fetchData, fetchPaidPreview]);

  const applyFilters = async () => {
    await fetchData();
  };

  const createPayroll = async () => {
    const amountNumber = Number(form.amountDollars);
    if (!form.userId) {
      toast.error("Select a user");
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber < 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const amountCents = Math.round(amountNumber * 100);
    const month = Number(form.month);
    const year = Number(form.year);
    if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year)) {
      toast.error("Enter a valid month and year");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: form.userId,
          payrollType: form.payrollType,
          amount: amountCents,
          month,
          year,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (
          data?.existingPayroll &&
          typeof data.existingPayroll?.month === "number" &&
          typeof data.existingPayroll?.year === "number"
        ) {
          const existingMonth = String(data.existingPayroll.month);
          const existingYear = String(data.existingPayroll.year);
          setFilters((p) => ({
            ...p,
            month: existingMonth,
            year: existingYear,
            status: "all",
          }));
          await fetchData();
          setTimeout(() => {
            document.getElementById("payroll-records")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 0);
          toast.error(
            `Payroll already exists for ${MONTHS.find((m) => m.value === existingMonth)?.label || existingMonth} ${existingYear} (${data.existingPayroll.status || "Existing"}). Showing it below.`
          );
          return;
        }
        toast.error(data.error || "Failed to create payroll");
        return;
      }
      toast.success("Payroll created");
      setForm((p) => ({ ...p, amountDollars: "" }));
      await Promise.all([fetchData(), fetchPaidPreview()]);
    } catch {
      toast.error("Failed to create payroll");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setStatus = async (id: string, status: PayrollStatus) => {
    setUpdatingId(id);
    try {
      const url =
        status === "Approved"
          ? `/api/payroll/${id}/approve`
          : status === "Rejected"
            ? `/api/payroll/${id}/reject`
            : `/api/payroll/${id}/pending`;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }
      toast.success("Updated");
      await Promise.all([fetchData(), fetchPaidPreview()]);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const totals = useMemo(() => {
    const approved = payroll.filter((p) => p.status === "Approved");
    return {
      totalApproved: approved.reduce((sum, p) => sum + p.amount, 0),
      totalAll: payroll.reduce((sum, p) => sum + p.amount, 0),
      count: payroll.length,
    };
  }, [payroll]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
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
            Payroll
          </CardTitle>
          <CardDescription>
            Create salary records per month and approve payments. Approved payroll is deducted from reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="text-lg font-semibold">
                {monthLabel} {filters.year}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Approved Payroll</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.totalApproved)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Records</p>
              <p className="text-lg font-semibold">{totals.count}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/payroll-history">View Payroll History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-medium">Preview Paid</CardTitle>
            <CardDescription>Latest approved payroll payments</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/payroll-history">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingPreview ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : paidPreview.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidPreview.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.user?.name || "Unknown"}
                      <div className="text-xs text-muted-foreground">@{p.user?.username || "-"}</div>
                    </TableCell>
                    <TableCell>
                      {p.payrollType === "Seller"
                        ? "Seller Salary"
                        : p.payrollType === "StoreBoy"
                          ? "Store Boy Salary"
                          : "Security Salary"}
                    </TableCell>
                    <TableCell>{MONTHS.find((m) => Number(m.value) === p.month)?.label || p.month}</TableCell>
                    <TableCell>{p.year}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(p.approvalDate || p.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">
              No paid records yet. Approve a payroll record to see it here and in Payroll History.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Create Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label>User</Label>
              <Select value={form.userId} onValueChange={(v) => setForm((p) => ({ ...p, userId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} (@{u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select
                value={form.payrollType}
                onValueChange={(v) => setForm((p) => ({ ...p, payrollType: v as PayrollType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Seller">Seller Salary</SelectItem>
                  <SelectItem value="StoreBoy">Store Boy Salary</SelectItem>
                  <SelectItem value="Security">Security Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amountDollars}
                onChange={(e) => setForm((p) => ({ ...p, amountDollars: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Month</Label>
              <Select value={form.month} onValueChange={(v) => setForm((p) => ({ ...p, month: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Year</Label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
              />
            </div>

            <div className="md:col-span-6">
              <Button onClick={createPayroll} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payroll
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="payroll-records">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Payroll Records</CardTitle>
            <CardDescription>Filter payroll by month, year, and status</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={applyFilters}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-5">
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
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="p-3 rounded-lg bg-muted/30 w-full">
                <p className="text-sm text-muted-foreground">Total (All)</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.totalAll)}</p>
              </div>
            </div>
          </div>

          {payroll.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.user?.name || "Unknown"}
                      <div className="text-xs text-muted-foreground">@{p.user?.username || "-"}</div>
                    </TableCell>
                    <TableCell>
                      {p.payrollType === "Seller" 
                        ? "Seller Salary" 
                        : p.payrollType === "StoreBoy" 
                        ? "Store Boy Salary" 
                        : "Security Salary"}
                    </TableCell>
                    <TableCell>{MONTHS.find((m) => Number(m.value) === p.month)?.label || p.month}</TableCell>
                    <TableCell>{p.year}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {p.status === "Pending" ? (
                        <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                          <Button
                            size="sm"
                            onClick={() => setStatus(p.id, "Approved")}
                            disabled={updatingId === p.id}
                          >
                            {updatingId === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Approve"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setStatus(p.id, "Rejected")}
                            disabled={updatingId === p.id}
                          >
                            {updatingId === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Reject"
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(p.id, "Pending")}
                          disabled={updatingId === p.id}
                        >
                          {updatingId === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Set Pending"
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">
              No payroll records found for the selected filters.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

