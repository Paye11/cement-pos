"use client";

import { useEffect, useState, useRef } from "react";
import { Calendar, TrendingUp, Package, Users, Download, Printer, FileText, FileSpreadsheet, FileJson } from "lucide-react";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { ReportPreview } from "@/components/report-preview";

interface ReportData {
  summary: {
    totalBags: number;
    totalBags32: number;
    totalBags42: number;
    totalRevenue: number;
    totalTransactions: number;
    totalPayroll: number;
    totalExpenses: number;
    totalStockReceived: number;
    totalStockReceived32: number;
    totalStockReceived42: number;
    netRevenue: number;
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
    bags32: number;
    bags42: number;
    revenue: number;
    count: number;
    payroll: number;
    expenses: number;
    stockReceived: number;
    stockReceived32: number;
    stockReceived42: number;
    netRevenue: number;
  }>;
  byDate: Array<{
    date: string;
    bags: number;
    revenue: number;
  }>;
}

interface User {
  id: string;
  name: string;
  username: string;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

const MONTHS = [
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

const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: (new Date().getFullYear() - i).toString(),
  label: (new Date().getFullYear() - i).toString(),
}));

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    month: "",
    year: "",
    userId: "all",
    reportType: "custom" as "custom" | "monthly",
  });
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [reportsRes, usersRes] = await Promise.all([
          fetch("/api/stats/reports"),
          fetch("/api/users"),
        ]);

        if (reportsRes.ok) {
          const reportData = await reportsRes.json();
          setData(reportData);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.users.filter((u: any) => u.role === "user"));
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load reports");
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.reportType === "monthly") {
        if (filters.month) params.append("month", filters.month);
        if (filters.year) params.append("year", filters.year);
      } else {
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
      }
      if (filters.userId !== "all") params.append("userId", filters.userId);

      const response = await fetch(`/api/stats/reports?${params.toString()}`);
      if (response.ok) {
        const reportData = await response.json();
        setData(reportData);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to update reports");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    fetchReports();
  };

  const handleClearFilter = () => {
    setFilters({
      startDate: "",
      endDate: "",
      month: "",
      year: "",
      userId: "all",
      reportType: "custom",
    });
    setTimeout(() => fetchReports(), 100);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToPDF = () => {
    if (!data) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.text("Financial Performance Report", pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 22, { align: "center" });
    doc.text(`Period: ${reportPeriod} | Seller: ${selectedUserName}`, pageWidth / 2, 28, { align: "center" });
    
    // Summary
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text("Summary", 14, 40);
    
    autoTable(doc, {
      startY: 45,
      head: [["Metric", "Value"]],
      body: [
        ["Total Stock Received", formatNumber(data.summary.totalStockReceived)],
        ["- Stock Received (32.5)", formatNumber(data.summary.totalStockReceived32)],
        ["- Stock Received (42.5)", formatNumber(data.summary.totalStockReceived42)],
        ["Total Bags Sold", formatNumber(data.summary.totalBags)],
        ["- Bags Sold (32.5)", formatNumber(data.summary.totalBags32)],
        ["- Bags Sold (42.5)", formatNumber(data.summary.totalBags42)],
        ["Total Revenue", formatCurrency(data.summary.totalRevenue)],
        ["Total Payroll (Salary)", formatCurrency(data.summary.totalPayroll)],
        ["Other Expenses", formatCurrency(data.summary.totalExpenses)],
        ["Net Revenue (Profit)", formatCurrency(data.summary.netRevenue)],
      ],
      theme: "striped",
    });

    // Seller Performance
    if (filters.userId === "all" && data.byUser.length > 0) {
      doc.addPage();
      doc.text("Seller Performance Breakdown", 14, 15);
      
      autoTable(doc, {
        startY: 20,
        head: [["Seller", "Received", "Sold (32/42)", "Revenue", "Salary", "Exp", "Net"]],
        body: data.byUser.map(u => [
          u.name,
          formatNumber(u.stockReceived),
          `${formatNumber(u.bags32)} / ${formatNumber(u.bags42)}`,
          formatCurrency(u.revenue),
          formatCurrency(u.payroll),
          formatCurrency(u.expenses),
          formatCurrency(u.netRevenue)
        ]),
      });
    }

    // Inventory Breakdown
    doc.addPage();
    doc.text("Inventory Sales Breakdown", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["Cement Type", "Transactions", "Bags Sold", "Revenue Generated"]],
      body: data.byCementType.map(item => [
        `Cement ${item.cementType}`,
        item.count,
        formatNumber(item.bags),
        formatCurrency(item.revenue)
      ]),
    });

    doc.save(`Financial_Report_${reportPeriod.replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF report downloaded");
  };

  const exportToExcel = () => {
    if (!data) return;

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ["Financial Performance Report"],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [`Period: ${reportPeriod}`],
      [`Seller: ${selectedUserName}`],
      [],
      ["Metric", "Value"],
      ["Total Stock Received", data.summary.totalStockReceived],
      ["- Stock Received (32.5)", data.summary.totalStockReceived32],
      ["- Stock Received (42.5)", data.summary.totalStockReceived42],
      ["Total Bags Sold", data.summary.totalBags],
      ["- Bags Sold (32.5)", data.summary.totalBags32],
      ["- Bags Sold (42.5)", data.summary.totalBags42],
      ["Total Revenue", data.summary.totalRevenue / 100],
      ["Total Payroll (Salary)", data.summary.totalPayroll / 100],
      ["Other Expenses", data.summary.totalExpenses / 100],
      ["Net Revenue (Profit)", data.summary.netRevenue / 100],
    ];
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWS, "Summary");

    // Seller Performance Sheet
    if (filters.userId === "all") {
      const sellerData = [
        ["Seller", "Stock Received", "Total Sold", "Sold 32.5", "Sold 42.5", "Revenue", "Salary", "Expenses", "Net Profit"],
        ...data.byUser.map(u => [
          u.name,
          u.stockReceived,
          u.bags,
          u.bags32,
          u.bags42,
          u.revenue / 100,
          u.payroll / 100,
          u.expenses / 100,
          u.netRevenue / 100
        ])
      ];
      const sellerWS = XLSX.utils.aoa_to_sheet(sellerData);
      XLSX.utils.book_append_sheet(workbook, sellerWS, "Seller Performance");
    }

    // Inventory Sheet
    const inventoryData = [
      ["Cement Type", "Transactions", "Bags Sold", "Revenue Generated"],
      ...data.byCementType.map(item => [
        `Cement ${item.cementType}`,
        item.count,
        item.bags,
        item.revenue / 100
      ])
    ];
    const inventoryWS = XLSX.utils.aoa_to_sheet(inventoryData);
    XLSX.utils.book_append_sheet(workbook, inventoryWS, "Inventory Breakdown");

    XLSX.writeFile(workbook, `Financial_Report_${reportPeriod.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Excel report downloaded");
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

  const selectedUserName = filters.userId === "all" ? "All Sellers" : users.find(u => u.id === filters.userId)?.name || "Unknown Seller";
  const reportPeriod = filters.reportType === "monthly" && filters.month && filters.year 
    ? `${MONTHS.find(m => m.value === filters.month)?.label} ${filters.year}`
    : filters.startDate && filters.endDate 
      ? `${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}`
      : "All Time";

  return (
    <div className="flex flex-col gap-6 print:p-0">
      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Configuration
          </CardTitle>
          <CardDescription>Select filters to generate specific financial reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label>Report Type</Label>
                <Select 
                  value={filters.reportType} 
                  onValueChange={(v: any) => setFilters({...filters, reportType: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                    <SelectItem value="monthly">Monthly Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Seller / User</Label>
                <Select 
                  value={filters.userId} 
                  onValueChange={(v) => setFilters({...filters, userId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Sellers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sellers</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} (@{user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filters.reportType === "monthly" ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>Month</Label>
                    <Select 
                      value={filters.month} 
                      onValueChange={(v) => setFilters({...filters, month: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Year</Label>
                    <Select 
                      value={filters.year} 
                      onValueChange={(v) => setFilters({...filters, year: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) =>
                        setFilters({ ...filters, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) =>
                        setFilters({ ...filters, endDate: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={handleFilter} className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button variant="outline" onClick={handleClearFilter}>
                Clear
              </Button>
              <ReportPreview 
                data={data}
                period={reportPeriod}
                sellerName={selectedUserName}
                onPrint={handlePrint}
                onPDF={exportToPDF}
                onExcel={exportToExcel}
              />
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Header (Visible in print) */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold">Financial Performance Report</h1>
        <p className="text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
        <div className="mt-4 flex justify-center gap-8">
          <div>
            <span className="font-semibold">Period: </span>
            <span>{reportPeriod}</span>
          </div>
          <div>
            <span className="font-semibold">Seller: </span>
            <span>{selectedUserName}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5 print:grid-cols-3">
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
            <CardDescription>Total Payroll</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {formatCurrency(data.summary.totalPayroll)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Staff salaries for the period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Other Expenses</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {formatCurrency(data.summary.totalExpenses)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Operational expenses recorded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Revenue</CardDescription>
            <CardTitle className="text-3xl text-accent">
              {formatCurrency(data.summary.netRevenue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Profit after all deductions
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
              Combined volume of sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts (Hidden in print if needed, but useful for visuals) */}
      <div className="grid gap-6 md:grid-cols-2 print:hidden">
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
              Sales Trend (Last 14 Days)
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

      {/* Seller Performance Table */}
      {filters.userId === "all" && (
        <Card className="print:shadow-none print:border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seller Performance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.byUser.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Bags Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Payroll</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byUser.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(user.bags)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(user.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(user.payroll)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(user.expenses)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-accent">
                        {formatCurrency(user.netRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No seller data found for this period
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cement Type Breakdown */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader>
          <CardTitle>Inventory Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byCementType.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cement Type</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Bags Sold</TableHead>
                  <TableHead className="text-right">Revenue Generated</TableHead>
                  <TableHead className="text-right">% of Volume</TableHead>
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
                      {data.summary.totalBags > 0
                        ? `${((item.bags / data.summary.totalBags) * 100).toFixed(1)}%`
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

      {/* Detailed Transaction List (Only in single user report or print) */}
      {filters.userId !== "all" && (
        <Card className="print:shadow-none print:border-none">
          <CardHeader>
            <CardTitle>Detailed Transactions for {selectedUserName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Showing detailed records for the period {reportPeriod}
            </p>
            {/* We could fetch individual transactions here if needed, 
                but for now we're using the aggregated data. 
                In a real scenario, we might want a separate table for detailed records. */}
            <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-center">
              <p className="text-sm">Summary of {selectedUserName}{"'"}s activities</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="font-semibold">{formatCurrency(data.byUser[0]?.revenue || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bags Sold</p>
                  <p className="font-semibold">{data.byUser[0]?.bags || 0} bags</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payroll Received</p>
                  <p className="font-semibold">{formatCurrency(data.byUser[0]?.payroll || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expenses Recorded</p>
                  <p className="font-semibold">{formatCurrency(data.byUser[0]?.expenses || 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

