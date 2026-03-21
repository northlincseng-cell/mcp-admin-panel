import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, RefreshCw, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { CarbonMarket } from "@shared/schema";

const fields: FieldDef[] = [
  { key: "name", label: "market name", required: true },
  { key: "price", label: "current price" },
  { key: "delta", label: "delta (e.g. +2.3%)" },
  {
    key: "trendUp",
    label: "trend",
    type: "select",
    options: [
      { label: "up", value: "true" },
      { label: "down", value: "false" },
    ],
  },
];

export default function CarbonMarkets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarbonMarket | null>(null);

  const { data: markets = [], isLoading } = useQuery<CarbonMarket[]>({
    queryKey: ["/api/markets"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/markets", { ...data, trendUp: data.trendUp === "true" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/markets/${editing?.id}`, { ...data, trendUp: data.trendUp === "true" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/markets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/markets/refresh"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    },
  });

  const trendingUp = markets.filter((m) => m.trendUp).length;
  const trendingDown = markets.filter((m) => !m.trendUp).length;

  return (
    <div>
      <PageHeader title="carbon markets" icon={TrendingUp} breadcrumb="data feeds">
        <Button
          variant="outline"
          size="sm"
          className="lowercase"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          data-testid="button-refresh-prices"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          {refreshMutation.isPending ? "refreshing..." : "refresh prices"}
        </Button>
        <Button size="sm" className="lowercase" onClick={() => { setEditing(null); setDialogOpen(true); }} data-testid="button-add-market">
          <Plus className="h-4 w-4 mr-1" /> add market
        </Button>
      </PageHeader>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="markets tracked" value={String(markets.length)} icon={BarChart3} subtitle="carbon credit markets" />
        <StatCard label="trending up" value={String(trendingUp)} icon={ArrowUpRight} subtitle="positive momentum" />
        <StatCard label="trending down" value={String(trendingDown)} icon={ArrowDownRight} subtitle="negative momentum" />
      </div>

      {/* Last updated */}
      {markets.length > 0 && (
        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground lowercase">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          last updated: {markets[0].updatedAt ? new Date(markets[0].updatedAt).toLocaleString() : "unknown"}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : markets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12 lowercase">no carbon markets configured</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {markets.map((market) => (
            <Card key={market.id} className="border border-border" data-testid={`card-market-${market.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold lowercase">{market.name}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing({ ...market, trendUp: market.trendUp } as any); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("delete?")) deleteMutation.mutate(market.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-xl font-bold mb-1">{market.price || "—"}</div>
                <div className={`flex items-center gap-1 text-sm font-medium ${market.trendUp ? "text-green-600" : "text-red-600"}`}>
                  {market.trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {market.delta || "0%"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "edit market" : "add market"}
        fields={fields}
        initialData={editing ? { ...editing, trendUp: String(editing.trendUp) } : undefined}
        onSubmit={(data) => editing ? updateMutation.mutate(data) : createMutation.mutate(data)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
