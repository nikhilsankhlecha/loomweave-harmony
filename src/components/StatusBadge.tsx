import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  // approval
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  auto_committed: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  // dispatch
  ready_to_pick: "bg-secondary text-secondary-foreground",
  awaiting_billing_auth: "bg-warning/15 text-warning border-warning/30",
  dispatched: "bg-success/15 text-success border-success/30",
  // sales orders
  confirmed: "bg-accent/15 text-accent border-accent/30",
  partial_dispatch: "bg-warning/15 text-warning border-warning/30",
  invoiced: "bg-primary/15 text-primary border-primary/30",
  closed: "bg-muted text-muted-foreground",
  // quotes
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-accent/15 text-accent border-accent/30",
  reservation_active: "bg-warning/15 text-warning border-warning/30",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  converted: "bg-success/15 text-success border-success/30",
  // invoices
  issued: "bg-accent/15 text-accent border-accent/30",
  paid: "bg-success/15 text-success border-success/30",
  partially_paid: "bg-warning/15 text-warning border-warning/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground",
  // lots
  active: "bg-success/15 text-success border-success/30",
  pending_qc: "bg-warning/15 text-warning border-warning/30",
  depleted: "bg-muted text-muted-foreground",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  at_processor: "bg-accent/15 text-accent border-accent/30",
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  return (
    <Badge variant="outline" className={cn("font-medium uppercase tracking-wide text-[10px]", map[status])}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}