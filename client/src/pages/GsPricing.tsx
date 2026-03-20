import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, Pencil } from "lucide-react";
import type { GsPricing } from "@shared/schema";

const fields: FieldDef[] = [
  { key: "tierName", label: "tier name", required: true },
  { key: "pricePerGs", label: "price per gs" },
  { key: "volumeRange", label: "volume range" },
  { key: "discountPct", label: "discount %" },
  { key: "description", label: "description", type: "textarea" },
];

export default function GsPricingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GsPricing | null>(null);

  const { data: pricing = [], isLoading } = useQuery<GsPricing[]>({
    queryKey: ["/api/pricing"],
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/pricing/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  return (
    <div>
      <PageHeader title="gs pricing" icon={DollarSign} breadcrumb="commercial" />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : pricing.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12 lowercase">no pricing tiers configured</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {pricing.map((tier) => (
              <Card key={tier.id} className="border border-border" data-testid={`card-pricing-${tier.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold lowercase">{tier.tierName}</h3>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(tier); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">{tier.pricePerGs || "—"}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground lowercase">volume range</span>
                      <p className="font-medium">{tier.volumeRange || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground lowercase">discount</span>
                      <p className="font-medium">{tier.discountPct || "—"}</p>
                    </div>
                  </div>
                  {tier.description && (
                    <p className="text-xs text-muted-foreground mt-2 lowercase">{tier.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border border-border">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold lowercase mb-1">projected annual revenue</h3>
              <p className="text-xs text-muted-foreground lowercase">
                based on current tier distribution and active deal pipeline
              </p>
              <p className="text-xl font-bold text-primary mt-2">£12.4M</p>
            </CardContent>
          </Card>
        </>
      )}

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="edit pricing tier"
        fields={fields}
        initialData={editing ?? undefined}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
