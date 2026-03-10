import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "Pending" | "Approved" | "Rejected";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "font-medium",
        status === "Pending" &&
          "bg-warning/15 text-warning-foreground border-warning/30 hover:bg-warning/20",
        status === "Approved" &&
          "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20",
        status === "Rejected" &&
          "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20",
        className
      )}
      variant="outline"
    >
      {status}
    </Badge>
  );
}
