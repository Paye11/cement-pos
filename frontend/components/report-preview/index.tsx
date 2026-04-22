"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Printer, Download, FileSpreadsheet } from "lucide-react";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportPreviewProps {
  data: any;
  period: string;
  sellerName: string;
  onPrint: () => void;
  onPDF: () => void;
  onExcel: () => void;
}

export function ReportPreview({
  data,
  period,
  sellerName,
  onPrint,
  onPDF,
  onExcel,
}: ReportPreviewProps) {
  if (!data) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Report Preview</DialogTitle>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-3 w-3 mr-1" /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={onPDF}>
              <Download className="h-3 w-3 mr-1" /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onExcel}>
              <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 mt-4">
          <div className="bg-white text-black p-8 border rounded-lg shadow-sm">
            {/* Report Header */}
            <div className="text-center mb-8 border-b pb-6">
              <h1 className="text-2xl font-bold uppercase tracking-wider">Financial Performance Report</h1>
              <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-6 text-left bg-gray-50 p-4 rounded">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Report Period</p>
                  <p className="font-medium">{period}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Target Seller</p>
                  <p className="font-medium">{sellerName}</p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 border rounded bg-blue-50/30">
                <p className="text-xs text-blue-600 font-bold uppercase mb-1">Total Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
              </div>
              <div className="p-4 border rounded bg-red-50/30">
                <p className="text-xs text-red-600 font-bold uppercase mb-1">Total Expenses</p>
                <p className="text-xl font-bold">{formatCurrency(data.summary.totalExpenses + data.summary.totalPayroll)}</p>
              </div>
              <div className="p-4 border rounded bg-green-50/30">
                <p className="text-xs text-green-600 font-bold uppercase mb-1">Net Revenue</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(data.summary.netRevenue)}</p>
              </div>
              <div className="p-4 border rounded bg-gray-50">
                <p className="text-xs text-gray-600 font-bold uppercase mb-1">Total Volume</p>
                <p className="text-xl font-bold">{formatNumber(data.summary.totalBags)} bags</p>
              </div>
            </div>

            {/* Inventory Breakdown */}
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase mb-4 text-gray-700 border-l-4 border-blue-500 pl-2">Inventory Breakdown</h3>
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="font-bold text-black">Category</TableHead>
                    <TableHead className="text-right font-bold text-black">Stock Received</TableHead>
                    <TableHead className="text-right font-bold text-black">Stock Sold</TableHead>
                    <TableHead className="text-right font-bold text-black">Remaining (Est)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Cement 32.5</TableCell>
                    <TableCell className="text-right">{formatNumber(data.summary.totalStockReceived32)}</TableCell>
                    <TableCell className="text-right">{formatNumber(data.summary.totalBags32)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatNumber(data.summary.totalStockReceived32 - data.summary.totalBags32)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Cement 42.5</TableCell>
                    <TableCell className="text-right">{formatNumber(data.summary.totalStockReceived42)}</TableCell>
                    <TableCell className="text-right">{formatNumber(data.summary.totalBags42)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatNumber(data.summary.totalStockReceived42 - data.summary.totalBags42)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>TOTAL COMBINED</TableCell>
                    <TableCell className="text-right">{formatNumber(data.summary.totalStockReceived)}</TableCell>
                    <TableCell className="text-right">{formatNumber(data.summary.totalBags)}</TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatNumber(data.summary.totalStockReceived - data.summary.totalBags)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Financial Details */}
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase mb-4 text-gray-700 border-l-4 border-red-500 pl-2">Financial Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span>Gross Sales Revenue</span>
                  <span className="font-semibold">{formatCurrency(data.summary.totalRevenue)}</span>
                </div>
                <div className="flex justify-between py-2 border-b text-red-600">
                  <span>Staff Salary / Payroll</span>
                  <span>- {formatCurrency(data.summary.totalPayroll)}</span>
                </div>
                <div className="flex justify-between py-2 border-b text-red-600">
                  <span>Operational Expenses</span>
                  <span>- {formatCurrency(data.summary.totalExpenses)}</span>
                </div>
                <div className="flex justify-between py-3 font-bold text-lg text-green-700 bg-green-50 px-2 rounded mt-2">
                  <span>Final Net Profit</span>
                  <span>{formatCurrency(data.summary.netRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t text-center">
              <p className="text-xs text-gray-400 italic">This is an electronically generated financial statement for {sellerName}.</p>
              <div className="flex justify-between mt-12 px-8">
                <div className="text-center">
                  <div className="w-32 border-b border-black mb-1"></div>
                  <p className="text-[10px] font-bold">Manager Signature</p>
                </div>
                <div className="text-center">
                  <div className="w-32 border-b border-black mb-1"></div>
                  <p className="text-[10px] font-bold">Date of Approval</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
