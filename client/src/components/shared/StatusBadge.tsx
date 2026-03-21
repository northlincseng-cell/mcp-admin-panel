import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  operational: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  live: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  connected: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  degraded: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  flagged: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  down: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  corporate: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  normal: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  // Pipeline stages
  prospect: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  "due diligence": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  contract: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  integration: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  // Deal pipeline stages
  prospect_deal: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  qualifying: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  proposal: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  negotiation: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  complete: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColors[status?.toLowerCase()] || statusColors.normal;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-medium lowercase border-0 px-2 py-0.5",
        colorClass,
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      {status}
    </Badge>
  );
}
