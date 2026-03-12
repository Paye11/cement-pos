"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [distribution, setDistribution] = useState<Record<"42.5" | "32.5", number>>({
    "42.5": 0,
    "32.5": 0,
  });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    cementType: "42.5" | "32.5" | null;
  }>({ open: false, cementType: null });
  const [editForm, setEditForm] = useState({
    totalStock: "",
    remainingStock: "",
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    cementType: "42.5" | "32.5" | null;
  }>({ open: false, cementType: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    cementType: "42.5",
    quantity: "",
  });

  const fetchInventory = async () => {
    try {
      const [invRes, summaryRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/admin/inventory-summary"),
      ]);
      if (invRes.ok) {
        const data = await invRes.json();
        setInventory(data.inventory);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setDistribution(data.distribution || { "42.5": 0, "32.5": 0 });
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

  const openEdit = (inv: Inventory) => {
    const cementType = inv.cementType as "42.5" | "32.5";
    setEditForm({
      totalStock: String(inv.totalStock),
      remainingStock: String(inv.remainingStock),
    });
    setEditDialog({ open: true, cementType });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.cementType) return;
    const cementType = editDialog.cementType;
    const totalStock = Number(editForm.totalStock);
    const remainingStock = Number(editForm.remainingStock);
    if (!Number.isFinite(totalStock) || !Number.isFinite(remainingStock)) {
      toast.error("Enter valid numbers");
      return;
    }
    if (totalStock < 0 || remainingStock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }
    if (remainingStock > totalStock) {
      toast.error("Remaining stock cannot exceed total stock");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/inventory/${cementType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalStock: Math.floor(totalStock),
          remainingStock: Math.floor(remainingStock),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to update stock");
        return;
      }

      setInventory((prev) =>
        prev.map((i) => (i.cementType === cementType ? data.inventory : i))
      );
      toast.success(`Updated Cement ${cementType} stock`);
      setEditDialog({ open: false, cementType: null });
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.cementType) return;
    const cementType = deleteDialog.cementType;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/inventory/${cementType}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to delete");
        return;
      }
      setInventory((prev) => prev.filter((i) => i.cementType !== cementType));
      toast.success(`Deleted Cement ${cementType} inventory`);
      setDeleteDialog({ open: false, cementType: null });
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
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
          const distributedForType =
            distribution[(inv.cementType as "42.5" | "32.5") ?? "42.5"] || 0;
          const canDelete = distributedForType === 0;

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
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(inv)}
                    disabled={isSubmitting || isDeleting}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() =>
                      canDelete
                        ? setDeleteDialog({
                            open: true,
                            cementType: inv.cementType as "42.5" | "32.5",
                          })
                        : toast.error(
                            `Cannot delete Cement ${inv.cementType} because stock has been distributed to users`
                          )
                    }
                    disabled={isSubmitting || isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Distributed</p>
                      <p className="text-lg font-semibold">
                        {formatNumber(distributedForType)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Deletable
                      </p>
                      <p className="text-lg font-semibold">
                        {canDelete ? "Yes" : "No"}
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

      <Dialog
        open={editDialog.open}
        onOpenChange={(open) =>
          setEditDialog({ open, cementType: open ? editDialog.cementType : null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stock</DialogTitle>
            <DialogDescription>
              Update total and remaining stock. Deleting is disabled if stock is distributed to users.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Total Stock</Label>
              <Input
                type="number"
                min="0"
                value={editForm.totalStock}
                onChange={(e) => setEditForm((p) => ({ ...p, totalStock: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Remaining Stock</Label>
              <Input
                type="number"
                min="0"
                value={editForm.remainingStock}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, remainingStock: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, cementType: null })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, cementType: open ? deleteDialog.cementType : null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inventory?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the cement inventory record. You can add it again later. You cannot delete if stock has been distributed to users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
