import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Radio, Info } from "lucide-react";
import type { C2050Stream } from "@shared/schema";

export default function C2050Feed() {
  const { data: streams = [], isLoading } = useQuery<C2050Stream[]>({
    queryKey: ["/api/streams"],
  });

  const columns: Column<C2050Stream>[] = [
    { key: "stream", label: "stream name", sortable: true },
    { key: "frequency", label: "frequency" },
    { key: "source", label: "source" },
    {
      key: "status",
      label: "status",
      render: (s) => <StatusBadge status={s.status ?? "live"} />,
    },
    { key: "lastUpdate", label: "last update" },
  ];

  return (
    <div>
      <PageHeader title="c2050 feed" icon={Radio} breadcrumb="data feeds" />

      {/* Connection status */}
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md mb-4">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm text-green-800 dark:text-green-300 lowercase">
          connected — all streams operational
        </span>
      </div>

      <DataTable
        columns={columns}
        data={streams}
        isLoading={isLoading}
        searchKey="stream"
        searchPlaceholder="search streams..."
        emptyMessage="no streams configured"
      />

      <Alert className="mt-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm lowercase text-blue-800 dark:text-blue-300">
          c2050 is the authoritative verification source. mgs receives verified project and country data. outbound: contract confirmations only.
        </AlertDescription>
      </Alert>
    </div>
  );
}
