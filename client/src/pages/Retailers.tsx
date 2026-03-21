import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Pencil, Trash2, Users, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import type { Retailer } from "@shared/schema";

const PIPELINE_STAGES = ["prospect", "due diligence", "contract", "integration", "live"] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

const stageColors: Record<PipelineStage, string> = {
  "prospect": "bg-slate-500",
  "due diligence": "bg-amber-500",
  "contract": "bg-blue-500",
  "integration": "bg-purple-500",
  "live": "bg-green-500",
};

const COMPLIANCE_ITEMS = [
  "kyc verification complete",
  "data processing agreement signed",
  "api credentials provisioned",
  "test transactions validated",
  "go-live sign-off obtained",
];

const STATUS_TO_STAGE: Record<string, PipelineStage> = {
  active: "live",
  pending: "prospect",
  inactive: "prospect",
};

const fields: FieldDef[] = [
  { key: "name", label: "name", required: true },
  { key: "code", label: "code", required: true },
  { key: "country", label: "country", placeholder: "UK" },
  { key: "flag", label: "flag emoji", placeholder: "🇬🇧" },
  {
    key: "status",
    label: "onboarding stage",
    type: "select",
    options: PIPELINE_STAGES.map((s) => ({ label: s, value: s })),
  },
  {
    key: "gsMatchPolicy",
    label: "gs match policy",
    type: "select",
    options: [
      { label: "none", value: "none" },
      { label: "fixed", value: "fixed" },
      { label: "percentage", value: "percentage" },
    ],
  },
  { key: "gsMatchValue", label: "gs match value", type: "number" },
  { key: "contactEmail", label: "contact email" },
  { key: "notes", label: "notes", type: "textarea" },
];

export default function Retailers() {
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Retailer | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [checklists, setChecklists] = useState<Record<number, boolean[]>>({});

  const { data: retailers = [], isLoading } = useQuery<Retailer[]>({
    queryKey: ["/api/retailers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/retailers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/retailers/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/retailers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
    },
  });

  // Map legacy statuses to pipeline stages
  const getStage = (r: Retailer): PipelineStage => {
    const status = r.status?.toLowerCase() || "prospect";
    if (PIPELINE_STAGES.includes(status as PipelineStage)) return status as PipelineStage;
    return STATUS_TO_STAGE[status] || "prospect";
  };

  const getChecklist = (id: number): boolean[] => {
    return checklists[id] || COMPLIANCE_ITEMS.map(() => false);
  };

  const toggleChecklistItem = (retailerId: number, index: number) => {
    setChecklists((prev) => {
      const current = prev[retailerId] || COMPLIANCE_ITEMS.map(() => false);
      const updated = [...current];
      updated[index] = !updated[index];
      return { ...prev, [retailerId]: updated };
    });
  };

  const getComplianceProgress = (id: number): number => {
    const cl = getChecklist(id);
    const done = cl.filter(Boolean).length;
    return Math.round((done / COMPLIANCE_ITEMS.length) * 100);
  };

  // Filtered retailers
  const filteredRetailers = useMemo(() => {
    if (!selectedStage) return retailers;
    return retailers.filter((r) => getStage(r) === selectedStage);
  }, [retailers, selectedStage]);

  // Stats
  const stageCounts = useMemo(() => {
    const counts: Record<PipelineStage, number> = {
      prospect: 0, "due diligence": 0, contract: 0, integration: 0, live: 0,
    };
    retailers.forEach((r) => { counts[getStage(r)]++; });
    return counts;
  }, [retailers]);

  const liveCount = stageCounts["live"];
  const inPipeline = retailers.length - liveCount;

  const columns: Column<Retailer>[] = [
    {
      key: "name",
      label: "name",
      sortable: true,
      render: (r) => (
        <button
          className="font-medium text-primary hover:underline lowercase"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/retailers/${r.id}`);
          }}
          data-testid={`link-retailer-${r.id}`}
        >
          {r.name}
        </button>
      ),
    },
    { key: "code", label: "code", sortable: true },
    { key: "country", label: "country", sortable: true },
    { key: "flag", label: "flag" },
    {
      key: "status",
      label: "stage",
      render: (r) => <StatusBadge status={getStage(r)} />,
    },
    {
      key: "gsMatchPolicy",
      label: "compliance",
      render: (r) => {
        const pct = getComplianceProgress(r.id);
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={pct} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground w-8">{pct}%</span>
          </div>
        );
      },
    },
    { key: "gsMatchValue", label: "match value" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setEditing(r);
              setDialogOpen(true);
            }}
            data-testid={`button-edit-${r.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive"
            onClick={() => {
              if (confirm("delete this retailer?")) deleteMutation.mutate(r.id);
            }}
            data-testid={`button-delete-${r.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="retailers" icon={Store} breadcrumb="retailers & products" />

      {/* Pipeline stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="total retailers" value={String(retailers.length)} icon={Users} subtitle="all retailers" />
        <StatCard label="live" value={String(liveCount)} icon={CheckCircle2} subtitle="fully onboarded" />
        <StatCard label="in pipeline" value={String(inPipeline)} icon={Clock} subtitle="onboarding in progress" />
      </div>

      {/* Pipeline stages */}
      <h2 className="text-sm font-semibold lowercase mb-3">onboarding pipeline</h2>
      <div className="flex gap-2 mb-6">
        {PIPELINE_STAGES.map((stage, i) => (
          <button
            key={stage}
            onClick={() => setSelectedStage(selectedStage === stage ? null : stage)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs lowercase transition-all ${
              selectedStage === stage
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border hover:border-primary/30"
            }`}
            data-testid={`stage-${stage.replace(/\s/g, "-")}`}
          >
            <span className={`w-2 h-2 rounded-full ${stageColors[stage]}`} />
            {stage}
            <Badge variant="secondary" className="text-[10px] ml-1">{stageCounts[stage]}</Badge>
            {i < PIPELINE_STAGES.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground ml-1" />
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredRetailers}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="search retailers..."
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        addLabel="add retailer"
      />

      {/* Compliance checklist panel — shows for selected retailer */}
      {filteredRetailers.length > 0 && (
        <>
          <h2 className="text-sm font-semibold lowercase mt-8 mb-3">compliance checklist</h2>
          <div className="grid grid-cols-2 gap-4">
            {filteredRetailers.map((r) => (
              <Card key={r.id} className="border border-border" data-testid={`checklist-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold lowercase">{r.name}</h3>
                    <div className="flex items-center gap-2">
                      <Progress value={getComplianceProgress(r.id)} className="h-2 w-20" />
                      <span className="text-xs text-muted-foreground">{getComplianceProgress(r.id)}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {COMPLIANCE_ITEMS.map((item, i) => (
                      <div key={item} className="flex items-center gap-2">
                        <Switch
                          checked={getChecklist(r.id)[i] || false}
                          onCheckedChange={() => toggleChecklistItem(r.id, i)}
                          className="scale-75"
                          data-testid={`check-${r.id}-${i}`}
                        />
                        <span className={`text-xs lowercase ${getChecklist(r.id)[i] ? "text-foreground line-through" : "text-muted-foreground"}`}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "edit retailer" : "add retailer"}
        fields={fields}
        initialData={editing ?? undefined}
        onSubmit={(data) =>
          editing ? updateMutation.mutate(data) : createMutation.mutate(data)
        }
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
