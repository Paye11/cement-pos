"use client";

import { useEffect, useState } from "react";
import { Calendar, TrendingUp, Package, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";
import { toast } from "sonner";

interface ReportData {
  summary: {
    totalBags: number;
    totalRevenue: number;
    totalTransactions: number;
  };
  byCementType: Array<{
    cementType: string;
    bags: number;
    revenue: number;
    count: number;
  }>;
  byUser: Array<{
    userId: string;
    name: string;
    bags: number;
    revenue: number;
    count: number;
  }>;
  byDate: Array<{
    date: string;
    bags: number;
    revenue: number;
  }>;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      const response = await fetch(`/api/stats/reports?${params.toString()}`);
      if (response.ok) {
        const reportData = await response.json();
        setData(reportData);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFilter = () => {
    fetchReports();
  };

  const handleClearFilter = () => {
    setDateRange({ startDate: "", endDate: "" });
    setTimeout(() => fetchReports(), 100);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load report data</p>
      </div>
    );
  }

  const pieData = data.byCementType.map((item) => ({
    name: `Cement ${item.cementType}`,
    value: item.bags,
    revenue: item.revenue,
  }));

  const barData = data.byDate.slice(-14).map((item) => ({
    date: formatDate(item.date),
    bags: item.bags,
    revenue: item.revenue / 100, // Convert to dollars for display
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>
            <Button onClick={handleFilter}>Apply Filter</Button>
            <Button variant="outline" onClick={handleClearFilter}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(data.summary.totalRevenue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              From {data.summary.totalTransactions} approved transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bags Sold</CardDescription>
            <CardTitle className="text-3xl">
              {formatNumber(data.summary.totalBags)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All approved sales combined
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Transaction Value</CardDescription>
            <CardTitle className="text-3xl">
              {data.summary.totalTransactions > 0
                ? formatCurrency(
                    data.summary.totalRevenue / data.summary.totalTransactions
                  )
                : "$0.00"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Average revenue per sale
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales by Cement Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sales by Cement Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        `${value} bags`,
                        "Quantity",
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Daily Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "revenue"
                          ? `$${value.toFixed(2)}`
                          : `${value} bags`,
                        name === "revenue" ? "Revenue" : "Bags",
                      ]}
                    />
                    <Bar dataKey="bags" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Sellers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Sellers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.byUser.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Bags Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byUser.slice(0, 10).map((user, index) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell className="text-right">{user.count}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(user.bags)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(user.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No sales data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cement Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cement Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byCementType.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cement Type</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Bags Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byCementType.map((item) => (
                  <TableRow key={item.cementType}>
                    <TableCell className="font-medium">
                      Cement {item.cementType}
                    </TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.bags)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {data.summary.totalRevenue > 0
                        ? `${((item.revenue / data.summary.totalRevenue) * 100).toFixed(1)}%`
                        : "0%"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No cement type data available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
