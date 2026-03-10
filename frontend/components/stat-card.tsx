import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: "default" | "warning" | "success" | "destructive";
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  variant = "default",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        variant === "warning" && "border-warning/50 bg-warning/5",
        variant === "success" && "border-accent/50 bg-accent/5",
        variant === "destructive" && "border-destructive/50 bg-destructive/5",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4",
              variant === "default" && "text-muted-foreground",
              variant === "warning" && "text-warning",
              variant === "success" && "text-accent",
              variant === "destructive" && "text-destructive"
            )}
          />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.isPositive ? "text-accent" : "text-destructive"
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}% from yesterday
          </p>
        )}
      </CardContent>
    </Card>
  );
}
