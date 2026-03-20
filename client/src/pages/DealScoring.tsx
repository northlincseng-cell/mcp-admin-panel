import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";
import type { Deal, ValueProtection } from "@shared/schema";

const simulatorDimensions = [
  { name: "carbon verification", score: 88 },
  { name: "value integrity", score: 92 },
  { name: "regulatory compliance", score: 100 },
  { name: "market alignment", score: 78 },
  { name: "social impact", score: 85 },
  { name: "governance", score: 91 },
];

export default function DealScoring() {
  const { data: deals = [], isLoading: loadingDeals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const columns: Column<Deal>[] = [
    { key: "name", label: "deal", sortable: true },
    { key: "country", label: "country" },
    {
      key: "score",
      label: "score",
      sortable: true,
      render: (d) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={d.score ?? 0} className="h-2 flex-1" />
          <span className="text-xs font-medium w-8">{d.score}%</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "status",
      render: (d) => <StatusBadge status={d.status} />,
    },
    { key: "type", label: "type", render: (d) => <StatusBadge status={d.type ?? "corporate"} /> },
  ];

  return (
    <div>
      <PageHeader title="deal scoring" icon={Target} breadcrumb="engines" />

      {/* Simulator */}
      <Card className="border border-border mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium lowercase">scoring simulator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground lowercase mb-3">
            how a deal would score against the 6 value protection dimensions
          </p>
          {simulatorDimensions.map((dim) => (
            <div key={dim.name} className="flex items-center gap-3">
              <div className="w-40 text-sm lowercase truncate">{dim.name}</div>
              <div className="flex-1">
                <Progress value={dim.score} className="h-2.5" />
              </div>
              <span className={`text-sm font-semibold w-10 text-right ${
                dim.score >= 80 ? "text-green-600" :
                dim.score >= 60 ? "text-amber-600" : "text-red-600"
              }`}>
                {dim.score}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t text-sm">
            <span className="text-muted-foreground lowercase">overall score: </span>
            <span className="font-bold text-primary">
              {Math.round(simulatorDimensions.reduce((s, d) => s + d.score, 0) / simulatorDimensions.length)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent deals table */}
      <h2 className="text-sm font-semibold lowercase mb-3">recent deals</h2>
      <DataTable
        columns={columns}
        data={deals}
        isLoading={loadingDeals}
        searchKey="name"
        searchPlaceholder="search deals..."
        emptyMessage="no deals found"
      />
    </div>
  );
}
