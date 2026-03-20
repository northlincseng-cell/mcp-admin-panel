import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
import type { Deal } from "@shared/schema";

const fields: FieldDef[] = [
  { key: "name", label: "deal name", required: true },
  { key: "country", label: "country" },
  { key: "flag", label: "flag" },
  { key: "volume", label: "volume" },
  { key: "price", label: "price/gs" },
  { key: "level", label: "tier level", type: "number" },
  { key: "score", label: "score (0-100)", type: "number" },
  {
    key: "status",
    label: "status",
    type: "select",
    options: [
      { label: "active", value: "active" },
      { label: "pending", value: "pending" },
      { label: "inactive", value: "inactive" },
    ],
  },
  {
    key: "type",
    label: "type",
    type: "select",
    options: [
      { label: "corporate", value: "corporate" },
      { label: "retail", value: "retail" },
      { label: "government", value: "government" },
    ],
  },
  { key: "notes", label: "notes", type: "textarea" },
];

export default function Deals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);

  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/deals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/deals/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/deals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
  });

  return (
    <div>
      <PageHeader title="corporate deals" icon={FileText} breadcrumb="commercial">
        <Button size="sm" className="lowercase" onClick={() => { setEditing(null); setDialogOpen(true); }} data-testid="button-add-deal">
          <Plus className="h-4 w-4 mr-1" /> add deal
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12 lowercase">no deals configured</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {deals.map((deal) => (
            <Card key={deal.id} className="border border-border" data-testid={`card-deal-${deal.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold lowercase">{deal.name}</h3>
                    <p className="text-xs text-muted-foreground lowercase">
                      {deal.flag} {deal.country}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(deal); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("delete?")) deleteMutation.mutate(deal.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground lowercase">volume</span>
                    <p className="font-medium">{deal.volume || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground lowercase">price/gs</span>
                    <p className="font-medium">{deal.price || "—"}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground lowercase">score</span>
                    <span className="font-medium">{deal.score}%</span>
                  </div>
                  <Progress value={deal.score ?? 0} className="h-2" />
                </div>
                <div className="flex gap-1.5">
                  <StatusBadge status={deal.status} />
                  <StatusBadge status={deal.type ?? "corporate"} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "edit deal" : "add deal"}
        fields={fields}
        initialData={editing ?? undefined}
        onSubmit={(data) => editing ? updateMutation.mutate(data) : createMutation.mutate(data)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
