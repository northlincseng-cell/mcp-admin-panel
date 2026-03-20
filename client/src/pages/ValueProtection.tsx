import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Pencil, AlertTriangle } from "lucide-react";
import type { ValueProtection } from "@shared/schema";

const editFields: FieldDef[] = [
  { key: "dimension", label: "dimension", required: true },
  { key: "weight", label: "weight (%)", type: "number" },
  { key: "description", label: "description", type: "textarea" },
];

const thresholdBands = [
  { range: "80–100", label: "green (auto-approved)", color: "bg-green-500" },
  { range: "60–79", label: "amber (flagged for review)", color: "bg-amber-500" },
  { range: "40–59", label: "orange (compliance required)", color: "bg-orange-500" },
  { range: "0–39", label: "red (rejected)", color: "bg-red-500" },
];

const hardFloors = [
  { dimension: "carbon verification", floor: "10% minimum", note: "must come from certified source" },
  { dimension: "value integrity", floor: "score ≥ 40", note: "below this score, deal is auto-rejected" },
  { dimension: "regulatory compliance", floor: "100%", note: "non-negotiable in all jurisdictions" },
];

export default function ValueProtectionPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ValueProtection | null>(null);

  const { data: dimensions = [], isLoading } = useQuery<ValueProtection[]>({
    queryKey: ["/api/value-protection"],
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/value-protection/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/value-protection"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  return (
    <div>
      <PageHeader title="value protection" icon={Shield} breadcrumb="engines" />

      <Alert className="mb-4 border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-sm lowercase text-red-800 dark:text-red-300">
          no project can be allowed if it undermines the value of a green square
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          {/* Scoring dimensions */}
          <Card className="border border-border mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium lowercase">scoring dimensions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dimensions.map((dim) => (
                <div key={dim.id} className="flex items-center gap-3" data-testid={`dim-${dim.id}`}>
                  <div className="w-32 text-sm lowercase truncate">{dim.dimension}</div>
                  <div className="flex-1">
                    <Progress value={dim.weight ?? 0} className="h-3" />
                  </div>
                  <span className="text-sm font-medium w-10 text-right">{dim.weight}%</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(dim); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {dimensions.length === 0 && (
                <p className="text-sm text-muted-foreground lowercase">no dimensions configured</p>
              )}
            </CardContent>
          </Card>

          {/* Threshold bands */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium lowercase">threshold bands</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {thresholdBands.map((band) => (
                  <div key={band.range} className="flex items-center gap-3 text-sm">
                    <div className={`w-3 h-3 rounded-full ${band.color}`} />
                    <span className="font-medium w-16">{band.range}</span>
                    <span className="text-muted-foreground lowercase">{band.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Hard floors */}
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium lowercase">hard floors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hardFloors.map((floor) => (
                  <div key={floor.dimension} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium lowercase">{floor.dimension}</span>
                      <span className="text-primary font-semibold">{floor.floor}</span>
                    </div>
                    <p className="text-xs text-muted-foreground lowercase">{floor.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="edit scoring dimension"
        fields={editFields}
        initialData={editing ?? undefined}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
