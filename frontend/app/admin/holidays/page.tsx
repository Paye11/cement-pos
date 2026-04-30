"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

interface HolidayRow {
  id: string;
  name: string;
  date: string;
}

function currentYear(): string {
  return String(new Date().getUTCFullYear());
}

export default function AdminHolidaysPage() {
  const [year, setYear] = useState(() => currentYear());
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [create, setCreate] = useState({ date: "", name: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const years = useMemo(() => {
    const y = new Date().getUTCFullYear();
    return [String(y - 1), String(y), String(y + 1), String(y + 2)];
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/holidays?year=${encodeURIComponent(year)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to load holidays");
        return;
      }
      setHolidays(data.holidays || []);
    } catch {
      toast.error("Failed to load holidays");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  const handleCreate = async () => {
    const name = create.name.trim();
    if (!create.date) return toast.error("Select a date");
    if (!name) return toast.error("Enter a holiday name");
    setIsCreating(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: create.date, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to add holiday");
        return;
      }
      toast.success("Holiday added");
      setCreate({ date: "", name: "" });
      await fetchData();
    } catch {
      toast.error("Failed to add holiday");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/holidays/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Deleted");
      await fetchData();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Liberia Holidays
          </CardTitle>
          <CardDescription>Holidays are excluded from daily sales report requirements.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Year</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" value={create.date} onChange={(e) => setCreate((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Name</Label>
              <Input value={create.name} onChange={(e) => setCreate((p) => ({ ...p, name: e.target.value }))} maxLength={120} />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              "Add Holiday"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Holidays</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holidays configured for {year}.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDate(h.date)}</TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(h.id)}
                        disabled={isDeleting === h.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting === h.id ? "Deleting..." : "Delete"}
                      </Button>
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

