import { type LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  icon: LucideIcon;
  breadcrumb?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, icon: Icon, breadcrumb, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold lowercase leading-tight" data-testid="text-page-title">
            {title}
          </h1>
          {breadcrumb && (
            <p className="text-xs text-muted-foreground lowercase">{breadcrumb}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="lowercase">live · last sync 2m ago</span>
        </div>
      </div>
    </div>
  );
}
