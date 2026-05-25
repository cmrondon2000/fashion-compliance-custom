import { cn } from "@/lib/utils";
import type { ComplianceStatus } from "@/lib/store";
import { CheckCircle2, Clock, AlertTriangle, Eye } from "lucide-react";

const config: Record<ComplianceStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  compliant: { label: "Compliant", className: "bg-success/15 text-success border-success/30", Icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30", Icon: Clock },
  "non-compliant": { label: "Non-compliant", className: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertTriangle },
  review: { label: "In review", className: "bg-info/15 text-info border-info/30", Icon: Eye },
};

export function StatusBadge({ status }: { status: ComplianceStatus }) {
  const { label, className, Icon } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
