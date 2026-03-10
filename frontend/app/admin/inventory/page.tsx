"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Loader2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

interface Inventory {
  cementType: string;
  totalStock: number;
  remainingStock: number;
  updatedAt: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    cementType: "42.5",
    quantity: "",
  });

  const fetchInventory = async () => {
    try {
      const response = await fetch("/api/inventory");
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddStock = async () => {
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 1) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cementType: formData.cementType,
          quantity,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInventory((prev) => {
          const existing = prev.find(
            (inv) => inv.cementType === data.inventory.cementType
          );
          if (existing) {
            return prev.map((inv) =>
              inv.cementType === data.inventory.cementType
                ? data.inventory
                : inv
            );
          }
          return [...prev, data.inventory];
        });
        toast.success(
          `Added ${quantity} bags to Cement ${formData.cementType}`
        );
        setAddDialogOpen(false);
        setFormData({ cementType: "42.5", quantity: "" });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to add stock");
      }
    } catch {
      toast.error("Failed to add stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockStatus = (remaining: number) => {
    if (remaining === 0) return { label: "Out of Stock", color: "destructive" };
    if (remaining < 100) return { label: "Low Stock", color: "warning" };
    return { label: "In Stock", color: "success" };
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventory Management</CardTitle>
            <CardDescription>
              Monitor and manage stock levels for each cement type
            </CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stock</DialogTitle>
                <DialogDescription>
                  Add new inventory to your stock
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cement-type">Cement Type</Label>
                  <Select
                    value={formData.cementType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cementType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="42.5">Cement 42.5</SelectItem>
                      <SelectItem value="32.5">Cement 32.5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="quantity">Quantity (bags)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="Enter number of bags"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddStock} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Add Stock
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {inventory.map((inv) => {
          const status = getStockStatus(inv.remainingStock);
          const percentage =
            inv.totalStock > 0
              ? (inv.remainingStock / inv.totalStock) * 100
              : 0;

          return (
            <Card key={inv.cementType}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Cement {inv.cementType}
                      </CardTitle>
                      <CardDescription>
                        {formatNumber(inv.remainingStock)} of{" "}
                        {formatNumber(inv.totalStock)} bags
                      </CardDescription>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium px-2 py-1 rounded-md ${
                      status.color === "destructive"
                        ? "bg-destructive/10 text-destructive"
                        : status.color === "warning"
                          ? "bg-warning/10 text-warning-foreground"
                          : "bg-accent/10 text-accent"
                    }`}
                  >
                    {status.label}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        Stock Level
                      </span>
                      <span className="font-medium">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={`h-2 ${
                        status.color === "destructive"
                          ? "[&>div]:bg-destructive"
                          : status.color === "warning"
                            ? "[&>div]:bg-warning"
                            : "[&>div]:bg-accent"
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Added
                      </p>
                      <p className="text-lg font-semibold">
                        {formatNumber(inv.totalStock)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sold</p>
                      <p className="text-lg font-semibold">
                        {formatNumber(inv.totalStock - inv.remainingStock)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {formatDateTime(inv.updatedAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {inventory.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  No inventory found. Add stock to get started.
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stock
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
