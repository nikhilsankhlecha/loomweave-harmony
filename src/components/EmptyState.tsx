import { LucideIcon, Inbox } from "lucide-react";
import { ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-3 py-16 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <div className="text-base font-semibold">{title}</div>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}