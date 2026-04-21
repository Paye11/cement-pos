"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Calculator, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

interface Price {
  cementType: string;
  pricePerBag: number;
}

interface Inventory {
  cementType: string;
  remainingStock: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const [prices, setPrices] = useState<Price[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    cementType: "",
    bagsSold: "",
    isAdvancePayment: false,
    useNegotiatedPrice: false,
    negotiatedPrice: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [pricesRes, inventoryRes] = await Promise.all([
          fetch("/api/prices"),
          fetch("/api/inventory"),
        ]);

        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          setPrices(pricesData.prices);
          if (pricesData.prices.length > 0) {
            setFormData((prev) => ({
              ...prev,
              cementType: pricesData.prices[0].cementType,
            }));
          }
        }

        if (inventoryRes.ok) {
          const inventoryData = await inventoryRes.json();
          setInventory(inventoryData.inventory);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load price data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const selectedPrice = prices.find((p) => p.cementType === formData.cementType);
  const selectedInventory = inventory.find(
    (i) => i.cementType === formData.cementType
  );
  const bags = parseInt(formData.bagsSold) || 0;
  
  // Calculate price to use
  const basePricePerBag = selectedPrice?.pricePerBag || 0;
  const negotiatedPrice = parseFloat(formData.negotiatedPrice) || 0;
  const pricePerBag = formData.useNegotiatedPrice ? negotiatedPrice : basePricePerBag;
  
  const total = pricePerBag * bags;
  const availableStock = selectedInventory?.remainingStock || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cementType || bags < 1) {
      toast.error("Please fill in all fields correctly");
      return;
    }

    if (formData.useNegotiatedPrice && negotiatedPrice <= 0) {
      toast.error("Please enter a valid negotiated price");
      return;
    }

    if (bags > availableStock) {
      toast.error(`Only ${availableStock} bags available in stock`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cementType: formData.cementType,
          bagsSold: bags,
          isAdvancePayment: formData.isAdvancePayment,
          negotiatedPrice: formData.useNegotiatedPrice ? negotiatedPrice : undefined,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          router.push("/seller/sales");
        }, 2000);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to submit sale");
      }
    } catch {
      toast.error("Failed to submit sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showSuccess) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sale Submitted!</h2>
            <p className="text-muted-foreground mb-4">
              Your sale has been submitted for admin approval.
            </p>
            <div className="p-4 rounded-lg bg-muted/50 w-full">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Cement Type:</span>
                <span className="font-medium">Cement {formData.cementType}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-medium">{bags} bags</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Redirecting to your sales history...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Record New Sale</CardTitle>
          <CardDescription>
            Enter the sale details. The transaction will be submitted for admin
            approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Cement Type Selection */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="cement-type">Cement Type</Label>
              <Select
                value={formData.cementType}
                onValueChange={(value) =>
                  setFormData({ ...formData, cementType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cement type" />
                </SelectTrigger>
                <SelectContent>
                  {prices.map((price) => {
                    const inv = inventory.find(
                      (i) => i.cementType === price.cementType
                    );
                    return (
                      <SelectItem key={price.cementType} value={price.cementType}>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>Cement {price.cementType}</span>
                          <span className="text-muted-foreground">
                            - {formatCurrency(price.pricePerBag)}/bag
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({inv?.remainingStock || 0} in stock)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedInventory && (
                <p className="text-sm text-muted-foreground">
                  Available: {selectedInventory.remainingStock} bags
                </p>
              )}
            </div>

            {/* Number of Bags */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="bags">Number of Bags</Label>
              <Input
                id="bags"
                type="number"
                min="1"
                max={availableStock}
                placeholder="Enter quantity"
                value={formData.bagsSold}
                onChange={(e) =>
                  setFormData({ ...formData, bagsSold: e.target.value })
                }
              />
              {bags > availableStock && (
                <p className="text-sm text-destructive">
                  Exceeds available stock ({availableStock} bags)
                </p>
              )}
            </div>

            {/* Advance Payment Option */}
            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
              <Checkbox
                id="isAdvancePayment"
                checked={formData.isAdvancePayment}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAdvancePayment: !!checked })
                }
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="isAdvancePayment">Advance Payment</Label>
                <p className="text-sm text-muted-foreground">
                  Check this if the buyer has paid but has not taken the cement yet.
                </p>
              </div>
            </div>

            {/* Negotiable Price Option */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useNegotiatedPrice"
                  checked={formData.useNegotiatedPrice}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, useNegotiatedPrice: !!checked })
                  }
                />
                <Label htmlFor="useNegotiatedPrice">Use Negotiated Price</Label>
              </div>

              {formData.useNegotiatedPrice && (
                <div className="flex flex-col gap-2 pl-6">
                  <Label htmlFor="negotiatedPrice">Negotiated Price (per bag)</Label>
                  <Input
                    id="negotiatedPrice"
                    type="number"
                    step="0.01"
                    placeholder="Enter price per bag"
                    value={formData.negotiatedPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, negotiatedPrice: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Original price: {formatCurrency(basePricePerBag)}
                  </p>
                </div>
              )}
            </div>

            {/* Calculation Summary */}
            {bags > 0 && selectedPrice && (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Calculation</span>
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Price per bag:
                      </span>
                      <span>{formatCurrency(selectedPrice.pricePerBag)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span>{bags} bags</span>
                    </div>
                    <div className="border-t pt-2 mt-1">
                      <div className="flex justify-between">
                        <span className="font-medium">Total Amount:</span>
                        <span className="font-semibold text-lg text-primary">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={
                isSubmitting ||
                !formData.cementType ||
                bags < 1 ||
                bags > availableStock
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>Submit Sale</>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Sales require admin approval before they are counted
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
