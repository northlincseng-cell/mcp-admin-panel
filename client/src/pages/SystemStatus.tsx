import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, CheckCircle } from "lucide-react";
import type { SystemStatus } from "@shared/schema";

export default function SystemStatusPage() {
  const { data: services = [], isLoading } = useQuery<SystemStatus[]>({
    queryKey: ["/api/system-status"],
  });

  const allOperational = services.every((s) => s.status === "operational");

  const columns: Column<SystemStatus>[] = [
    { key: "service", label: "service", sortable: true },
    {
      key: "status",
      label: "status",
      render: (s) => <StatusBadge status={s.status ?? "operational"} />,
    },
    { key: "uptime", label: "uptime" },
    {
      key: "lastChecked",
      label: "last checked",
      render: (s) => (
        <span className="text-xs text-muted-foreground">
          {s.lastChecked ? new Date(s.lastChecked).toLocaleString() : "—"}
        </span>
      ),
    },
    { key: "notes", label: "notes" },
  ];

  return (
    <div>
      <PageHeader title="system status" icon={Activity} breadcrumb="audit" />

      <Card className="mb-4 border border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle className={`h-5 w-5 ${allOperational ? "text-green-600" : "text-amber-600"}`} />
          <div>
            <p className="text-sm font-semibold lowercase">
              {allOperational ? "all systems operational" : "some services degraded"}
            </p>
            <p className="text-xs text-muted-foreground lowercase">
              {services.length} services monitored
            </p>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={services}
        isLoading={isLoading}
        searchKey="service"
        searchPlaceholder="search services..."
        emptyMessage="no services registered"
      />
    </div>
  );
}
