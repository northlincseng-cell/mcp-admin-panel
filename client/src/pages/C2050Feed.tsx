import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, AlertTriangle, Lock, Database, Shield, FileCheck } from "lucide-react";
import type { C2050Stream } from "@shared/schema";

const pendingIntegrations = [
  { name: "verification api", icon: Shield, description: "real-time project verification status from c2050 platform" },
  { name: "ipcc reference data", icon: Database, description: "ipcc ar6 emission factors and carbon coefficients" },
  { name: "s&p global ratings feed", icon: FileCheck, description: "esg ratings and sustainability scores for counterparties" },
  { name: "kpmg audit stream", icon: Lock, description: "third-party audit results and compliance certifications" },
];

const expectedFields = [
  "project_id", "verification_status", "carbon_credits_issued", "vintage_year",
  "methodology", "registry", "country_of_origin", "sdg_alignment",
  "permanence_risk_score", "additionality_assessment", "last_audit_date",
];

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

      {/* Integration pending banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-6">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 lowercase mb-1">integration pending</h3>
          <p className="text-xs text-muted-foreground lowercase">
            c2050 data integration requires api credentials from the c2050 verification platform. the ingestion framework is ready — configure the endpoint in .env when available.
          </p>
        </div>
      </div>

      {/* Current streams */}
      <h2 className="text-sm font-semibold lowercase mb-3">configured streams</h2>
      <DataTable
        columns={columns}
        data={streams}
        isLoading={isLoading}
        searchKey="stream"
        searchPlaceholder="search streams..."
        emptyMessage="no streams configured"
      />

      {/* Pending integrations */}
      <h2 className="text-sm font-semibold lowercase mt-8 mb-3">pending integrations</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {pendingIntegrations.map((item) => (
          <Card key={item.name} className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-muted">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold lowercase">{item.name}</h3>
                    <Badge variant="outline" className="text-[10px] lowercase border-amber-500/30 text-amber-500">
                      awaiting credentials
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground lowercase">{item.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expected data fields */}
      <h2 className="text-sm font-semibold lowercase mb-3">expected data fields</h2>
      <Card className="border border-border">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground lowercase mb-3">
            once the c2050 verification api is connected, the following fields will be available for each project:
          </p>
          <div className="flex flex-wrap gap-2">
            {expectedFields.map((field) => (
              <Badge key={field} variant="secondary" className="text-xs lowercase font-mono">
                {field}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
