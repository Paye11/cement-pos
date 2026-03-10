
"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface InventoryItem {
  cementType: "42.5" | "32.5";
  totalAssigned: number;
  remainingStock: number;
}

interface UserInventoryProps {
  userId: string;
  userName: string;
}

export function UserInventoryManagement({ userId, userName }: UserInventoryProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  
  // Form state
  const [cementType, setCementType] = useState<"42.5" | "32.5">("42.5");
  const [action, setAction] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/user-inventory?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory || []);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/user-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          cementType,
          action,
          amount: parseInt(amount),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Successfully ${action === "add" ? "added" : "removed"} stock`);
        setAmount("");
        fetchInventory();
      } else {
        toast.error(data.error || "Failed to update inventory");
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInventoryItem = (type: "42.5" | "32.5") => {
    return inventory.find((i) => i.cementType === type) || { totalAssigned: 0, remainingStock: 0 };
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Manage Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Inventory for {userName}</DialogTitle>
          <DialogDescription>
            Add or remove stock assignments for this user.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Stock Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Cement 42.5</span>
                <div className="flex justify-between items-end">
                  <span className="text-xl font-bold">{getInventoryItem("42.5").remainingStock}</span>
                  <span className="text-xs text-muted-foreground">/ {getInventoryItem("42.5").totalAssigned} assigned</span>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Cement 32.5</span>
                <div className="flex justify-between items-end">
                  <span className="text-xl font-bold">{getInventoryItem("32.5").remainingStock}</span>
                  <span className="text-xs text-muted-foreground">/ {getInventoryItem("32.5").totalAssigned} assigned</span>
                </div>
              </div>
            </div>

            {/* Update Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={cementType}
                    onValueChange={(v: "42.5" | "32.5") => setCementType(v)}
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
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={action}
                    onValueChange={(v: "add" | "remove") => setAction(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add Stock</SelectItem>
                      <SelectItem value="remove">Remove Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount (Bags)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    {action === "add" ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
                    {action === "add" ? "Add Stock" : "Remove Stock"}
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
