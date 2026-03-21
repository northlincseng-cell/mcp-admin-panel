import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DollarSign,
  ArrowDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Zap,
  Download,
} from "lucide-react";
import { exportToCsv } from "@/lib/export";
import type { GsPricing, VolumeTier, Deal } from "@shared/schema";

/** Format a numeric price to display string */
function fmtPrice(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return "—";
  if (n < 0.01) return `£${n.toFixed(4)}`;
  return `£${n.toFixed(3)}`;
}

export default function GsPricingPage() {
  const [cascadeDialogOpen, setCascadeDialogOpen] = useState(false);
  const [newBasePrice, setNewBasePrice] = useState("");

  const { data: pricing = [], isLoading: pricingLoading } = useQuery<GsPricing[]>({
    queryKey: ["/api/pricing"],
  });

  const { data: tiers = [], isLoading: tiersLoading } = useQuery<VolumeTier[]>({
    queryKey: ["/api/tiers"],
  });

  const { data: flaggedDeals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals/flagged"],
  });

  const { data: allDeals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const basePrice = pricing.find((p) => p.isBasePrice);
  const derivedTiers = pricing.filter((p) => !p.isBasePrice);

  const cascadeMutation = useMutation({
    mutationFn: (data: { basePriceId: number; newPriceNumeric: number }) =>
      apiRequest("POST", "/api/pricing/cascade", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tiers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/flagged"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setCascadeDialogOpen(false);
      setNewBasePrice("");
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/deals/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/flagged"] });
    },
  });

  const acknowledgeAllMutation = useMutation({
    mutationFn: async () => {
      for (const deal of flaggedDeals) {
        await apiRequest("POST", `/api/deals/${deal.id}/acknowledge`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/flagged"] });
    },
  });

  const isLoading = pricingLoading || tiersLoading;

  const handleCascade = () => {
    if (!basePrice || !newBasePrice) return;
    const val = parseFloat(newBasePrice);
    if (isNaN(val) || val <= 0) return;
    cascadeMutation.mutate({ basePriceId: basePrice.id, newPriceNumeric: val });
  };

  // Stats
  const activeDeals = allDeals.filter((d) => d.status === "active");
  const totalVolume = activeDeals.reduce((sum, d) => {
    const match = d.volume?.match(/([\d.]+)\s*([MmKk])/);
    if (!match) return sum;
    const val = parseFloat(match[1]);
    const mult = match[2].toUpperCase() === "M" ? 1_000_000 : 1_000;
    return sum + val * mult;
  }, 0);

  return (
    <div>
      <PageHeader title="gs pricing" icon={DollarSign} breadcrumb="commercial — single source of truth">
        {flaggedDeals.length > 0 && (
          <Badge variant="destructive" className="lowercase text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {flaggedDeals.length} deal{flaggedDeals.length > 1 ? "s" : ""} flagged
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          className="lowercase"
          data-testid="button-export-csv"
          onClick={() => {
            const rows = [...derivedTiers, ...(basePrice ? [basePrice] : [])].map((t) => ({
              tierName: t.tierName,
              pricePerGs: t.priceNumeric,
              volumeRange: t.volumeRange ?? "",
              discount: t.discountPct ?? "",
              description: t.description ?? "",
            }));
            exportToCsv(rows, "gs-pricing", [
              { key: "tierName", label: "tier name" },
              { key: "pricePerGs", label: "price per gs" },
              { key: "volumeRange", label: "volume range" },
              { key: "discount", label: "discount" },
              { key: "description", label: "description" },
            ]);
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          export csv
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ═══ BASE PRICE — SOURCE OF TRUTH ═══ */}
          <Card className="border-2 border-primary/30 bg-primary/5" data-testid="card-base-price">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold lowercase">base rate — source of truth</h2>
                  </div>
                  <p className="text-xs text-muted-foreground lowercase">
                    all volume tiers and deal prices derive from this single value. voluntary credits — not regulated.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary" data-testid="text-base-price">
                    {fmtPrice(basePrice?.priceNumeric)}
                  </div>
                  <p className="text-xs text-muted-foreground lowercase">per green square</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  className="lowercase"
                  onClick={() => setCascadeDialogOpen(true)}
                  data-testid="button-change-base-price"
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                  change base price
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ═══ CASCADE FLOW DIAGRAM ═══ */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground lowercase px-1">
            <span className="font-medium text-primary">base rate</span>
            <ArrowRight className="h-3 w-3" />
            <span>gs pricing tiers</span>
            <ArrowRight className="h-3 w-3" />
            <span>volume tiers</span>
            <ArrowRight className="h-3 w-3" />
            <span>deal effective prices</span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-amber-500">approval queue</span>
          </div>

          {/* ═══ GS PRICING TIERS ═══ */}
          <div>
            <h3 className="text-sm font-semibold lowercase mb-3">gs pricing tiers</h3>
            <div className="grid grid-cols-3 gap-3">
              {derivedTiers.map((tier) => (
                <Card key={tier.id} className="border border-border" data-testid={`card-tier-${tier.id}`}>
                  <CardContent className="p-3.5">
                    <h4 className="text-xs font-semibold lowercase mb-1">{tier.tierName}</h4>
                    <div className="text-xl font-bold text-primary">{fmtPrice(tier.priceNumeric)}</div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground lowercase">volume range</span>
                        <span className="font-medium">{tier.volumeRange || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground lowercase">discount from base</span>
                        <span className="font-medium">{tier.discountPct || "0%"}</span>
                      </div>
                    </div>
                    {tier.description && (
                      <p className="text-[11px] text-muted-foreground mt-2 lowercase">{tier.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ═══ VOLUME TIERS ═══ */}
          <div>
            <h3 className="text-sm font-semibold lowercase mb-3">volume tiers</h3>
            <div className="grid grid-cols-4 gap-3">
              {tiers.map((tier) => (
                <Card key={tier.id} className="border border-border" data-testid={`card-vtier-${tier.id}`}>
                  <CardContent className="p-3.5">
                    <h4 className="text-xs font-semibold lowercase mb-1">{tier.name}</h4>
                    <div className="text-lg font-bold text-primary">{fmtPrice(tier.priceNumeric)}</div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground lowercase">threshold</span>
                        <span className="font-medium">{tier.threshold || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground lowercase">discount</span>
                        <span className="font-medium">{tier.discount || "0%"}</span>
                      </div>
                    </div>
                    {tier.description && (
                      <p className="text-[11px] text-muted-foreground mt-2 lowercase">{tier.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ═══ FLAGGED DEALS QUEUE ═══ */}
          {flaggedDeals.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold lowercase flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  flagged deals — review required
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="lowercase text-xs"
                  onClick={() => acknowledgeAllMutation.mutate()}
                  disabled={acknowledgeAllMutation.isPending}
                  data-testid="button-acknowledge-all"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  acknowledge all
                </Button>
              </div>
              <div className="space-y-2">
                {flaggedDeals.map((deal) => (
                  <Card key={deal.id} className="border border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5" data-testid={`card-flagged-${deal.id}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-sm font-medium lowercase">{deal.name}</span>
                          <span className="text-xs text-muted-foreground ml-2 lowercase">
                            {deal.flag} {deal.country}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-xs">
                          <div className="text-muted-foreground lowercase">effective price</div>
                          <div className="font-bold text-primary">{fmtPrice(deal.effectivePrice)}</div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="text-muted-foreground lowercase">
                            {deal.discountType === "fixed_override" ? "fixed override" : `${deal.discountValue}% off tier`}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="lowercase text-xs h-7"
                          onClick={() => acknowledgeMutation.mutate(deal.id)}
                          disabled={acknowledgeMutation.isPending}
                          data-testid={`button-ack-${deal.id}`}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          acknowledge
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* ═══ SUMMARY STATS ═══ */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border border-border">
              <CardContent className="p-4">
                <h4 className="text-xs text-muted-foreground lowercase mb-1">active deals</h4>
                <p className="text-xl font-bold">{activeDeals.length}</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4">
                <h4 className="text-xs text-muted-foreground lowercase mb-1">total volume (active)</h4>
                <p className="text-xl font-bold">
                  {totalVolume >= 1_000_000 ? `${(totalVolume / 1_000_000).toFixed(1)}M GS/yr` : `${(totalVolume / 1_000).toFixed(0)}K GS/yr`}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4">
                <h4 className="text-xs text-muted-foreground lowercase mb-1">projected annual revenue</h4>
                <p className="text-xl font-bold text-primary">
                  {basePrice?.priceNumeric ? fmtPrice(totalVolume * basePrice.priceNumeric) : "—"}/yr
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══ CASCADE DIALOG ═══ */}
      <Dialog open={cascadeDialogOpen} onOpenChange={setCascadeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold lowercase">change base price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground lowercase">current:</div>
              <div className="text-lg font-bold">{fmtPrice(basePrice?.priceNumeric)}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs lowercase text-muted-foreground">new base price (£ per gs)</label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                value={newBasePrice}
                onChange={(e) => setNewBasePrice(e.target.value)}
                placeholder="e.g. 0.006"
                className="h-9 text-sm"
                data-testid="input-new-base-price"
              />
            </div>
            {newBasePrice && basePrice?.priceNumeric && parseFloat(newBasePrice) > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 lowercase">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  cascade preview
                </div>
                <div className="text-xs space-y-1 text-muted-foreground lowercase">
                  <p>
                    {((parseFloat(newBasePrice) / basePrice.priceNumeric - 1) * 100).toFixed(1)}% change from {fmtPrice(basePrice.priceNumeric)} to {fmtPrice(parseFloat(newBasePrice))}
                  </p>
                  <p>
                    <ArrowDown className="h-3 w-3 inline mr-1" />
                    {derivedTiers.length} pricing tiers will be recalculated proportionally
                  </p>
                  <p>
                    <ArrowDown className="h-3 w-3 inline mr-1" />
                    {tiers.length} volume tiers will be recalculated
                  </p>
                  <p>
                    <ArrowDown className="h-3 w-3 inline mr-1" />
                    {allDeals.filter((d) => d.status === "active" || d.status === "pending").length} active/pending deals will be flagged for review
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="lowercase"
              onClick={() => setCascadeDialogOpen(false)}
            >
              cancel
            </Button>
            <Button
              size="sm"
              className="lowercase"
              onClick={handleCascade}
              disabled={cascadeMutation.isPending || !newBasePrice || parseFloat(newBasePrice) <= 0}
              data-testid="button-confirm-cascade"
            >
              {cascadeMutation.isPending ? "cascading..." : "cascade update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
