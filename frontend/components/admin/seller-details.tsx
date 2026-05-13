"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Loader2, Package, TrendingUp, History, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SellerDetailsModalProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StockRecord {
  id: string;
  cementType: string;
  amount: number;
  createdAt: string;
}

interface SaleRecord {
  id: string;
  cementType: string;
  bagsSold: number;
  totalAmount: number;
  createdAt: string;
}

export function SellerDetailsModal({
  userId,
  userName,
  isOpen,
  onClose,
}: SellerDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    stockHistory: StockRecord[];
    salesHistory: SaleRecord[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDetails();
    }
  }, [isOpen, userId]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/stock-history`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch seller details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group stock history by date (Y-M-D H:M) to see if we can combine 32.5 and 42.5
  const getGroupedStock = () => {
    if (!data) return [];
    
    const groups: Record<string, { date: string; "32.5": number; "42.5": number }> = {};
    
    data.stockHistory.forEach(log => {
      const date = new Date(log.createdAt);
      // Group by date and hour/minute to catch simultaneous additions
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
      
      if (!groups[key]) {
        groups[key] = {
          date: log.createdAt,
          "32.5": 0,
          "42.5": 0
        };
      }
      
      if (log.cementType === "32.5" || log.cementType === "42.5") {
        groups[key][log.cementType] += log.amount;
      }
    });
    
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const downloadStockPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const groupedStock = getGroupedStock();
    
    doc.setFontSize(18);
    doc.text("Stock Addition History", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Seller: ${userName}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);
    
    const tableData = groupedStock.map(group => [
      formatDateTime(group.date),
      group["32.5"] > 0 ? `+${group["32.5"]}` : "0",
      group["42.5"] > 0 ? `+${group["42.5"]}` : "0",
      String(group["32.5"] + group["42.5"])
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["Date Added", "Cement 32.5", "Cement 42.5", "Total Bags"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`${userName.replace(/\s+/g, "_")}_stock_history.pdf`);
  };

  const downloadSalesPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Sales Records", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Seller: ${userName}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);
    
    const tableData = data.salesHistory.map(sale => [
      formatDateTime(sale.createdAt),
      `Cement ${sale.cementType}`,
      String(sale.bagsSold),
      formatCurrency(sale.totalAmount)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["Date Sold", "Type", "Bags", "Amount"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [39, 174, 96] },
    });

    doc.save(`${userName.replace(/\s+/g, "_")}_sales_records.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-col gap-4 pr-8">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                Detailed Records for {userName}
              </DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadStockPDF}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                <Download className="h-4 w-4" /> Download Stock PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadSalesPDF}
                className="flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              >
                <Download className="h-4 w-4" /> Download Sales PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !data ? (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load data
          </div>
        ) : (
          <Tabs defaultValue="stock" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stock" className="flex items-center gap-2">
                <Package className="h-4 w-4" /> Stock Added History
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Sales Records
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stock" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[500px] border rounded-md">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="text-right">Cement 32.5</TableHead>
                      <TableHead className="text-right">Cement 42.5</TableHead>
                      <TableHead className="text-right font-bold">Total Bags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getGroupedStock().map((group, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(group.date)}
                        </TableCell>
                        <TableCell className="text-right">
                          {group["32.5"] > 0 ? (
                            <span className="font-medium text-blue-600">+{group["32.5"]}</span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {group["42.5"] > 0 ? (
                            <span className="font-medium text-purple-600">+{group["42.5"]}</span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {group["32.5"] + group["42.5"]}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.stockHistory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No stock additions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sales" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[500px] border rounded-md">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead>Date Sold</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Bags</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.salesHistory.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(sale.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          Cement {sale.cementType}
                        </TableCell>
                        <TableCell className="text-right">
                          {sale.bagsSold}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-accent">
                          {formatCurrency(sale.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.salesHistory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No sales records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
