"use client";

import { useEffect, useState } from "react";
import { DollarSign, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

interface Price {
  cementType: string;
  pricePerBag: number;
  updatedAt: string;
}

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchPrices = async () => {
    try {
      const response = await fetch("/api/prices");
      if (response.ok) {
        const data = await response.json();
        setPrices(data.prices);
        // Initialize edit values
        const values: Record<string, string> = {};
        data.prices.forEach((p: Price) => {
          values[p.cementType] = (p.pricePerBag / 100).toFixed(2);
        });
        setEditValues(values);
      }
    } catch (error) {
      console.error("Failed to fetch prices:", error);
      toast.error("Failed to load prices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const handleSave = async (cementType: string) => {
    const newPrice = parseFloat(editValues[cementType]);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setEditingType(cementType);
    try {
      const response = await fetch(`/api/prices/${cementType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerBag: Math.round(newPrice * 100) }),
      });

      if (response.ok) {
        const data = await response.json();
        setPrices((prev) =>
          prev.map((p) =>
            p.cementType === cementType
              ? {
                  cementType: data.price.cementType,
                  pricePerBag: data.price.pricePerBag,
                  updatedAt: data.price.updatedAt,
                }
              : p
          )
        );
        toast.success(`Price for Cement ${cementType} updated successfully`);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update price");
      }
    } catch {
      toast.error("Failed to update price");
    } finally {
      setEditingType(null);
    }
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
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Price Management</CardTitle>
          <CardDescription>
            Set the price per bag for each cement type. Changes will apply to
            new transactions only.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {prices.map((price) => (
          <Card key={price.cementType}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Cement {price.cementType}
                  </CardTitle>
                  <CardDescription>
                    Current: {formatCurrency(price.pricePerBag)} per bag
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`price-${price.cementType}`}>
                    Price per Bag (USD)
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id={`price-${price.cementType}`}
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        value={editValues[price.cementType] || ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [price.cementType]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      onClick={() => handleSave(price.cementType)}
                      disabled={editingType === price.cementType}
                    >
                      {editingType === price.cementType ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span className="ml-2">Save</span>
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated: {formatDateTime(price.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {prices.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No prices configured. Please run the seed script to initialize
                prices.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
