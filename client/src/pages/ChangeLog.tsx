import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import type { ChangeLogEntry } from "@shared/schema";

export default function ChangeLog() {
  const { data: entries = [], isLoading } = useQuery<ChangeLogEntry[]>({
    queryKey: ["/api/changelog"],
  });

  return (
    <div>
      <PageHeader title="change log" icon={History} breadcrumb="audit" />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12 lowercase">
          no audit entries yet
        </p>
      ) : (
        <div className="space-y-0">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0"
              data-testid={`changelog-${entry.id}`}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center mt-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                {i < entries.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 min-h-[20px]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <StatusBadge status={entry.action} />
                  <span className="text-xs text-muted-foreground lowercase">{entry.section}</span>
                </div>
                <p className="text-sm lowercase truncate">{entry.detail}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="lowercase">{entry.userName}</span>
                  <span>·</span>
                  <span>
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
