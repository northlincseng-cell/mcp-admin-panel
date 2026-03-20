import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  subtitle?: string;
}

export function StatCard({ label, value, icon: Icon, subtitle }: StatCardProps) {
  return (
    <Card className="border border-border" data-testid={`stat-card-${label.replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground lowercase">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-xl font-semibold tracking-tight">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 lowercase">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
