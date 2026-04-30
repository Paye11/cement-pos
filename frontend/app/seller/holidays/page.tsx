"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function SellerHolidaysPage() {
  const [year, setYear] = useState(() => currentYear());
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const years = useMemo(() => {
    const y = new Date().getUTCFullYear();
    return [String(y - 1), String(y), String(y + 1)];
  }, []);

  useEffect(() => {
    async function fetchData() {
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
    }
    fetchData();
  }, [year]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Liberia Holidays
          </CardTitle>
          <CardDescription>These dates are excluded from daily sales report submissions.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDate(h.date)}</TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
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

