import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, RefreshCw, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { CarbonMarket } from "@shared/schema";

interface HistoryPoint {
  id: number;
  marketId: number;
  price: number;
  recordedAt: string;
}

function MiniChart({ marketId }: { marketId: number }) {
  const { data: history = [] } = useQuery<HistoryPoint[]>({
    queryKey: ["/api/markets", marketId, "history"],
    queryFn: async () => { const r = await apiRequest("GET", `/api/markets/${marketId}/history`); return r.json(); },
  });
  if (history.length < 2) return null;
  const chartData = history.map(h => ({
    date: new Date(h.recordedAt).toLocaleDateString("en-GB", { month: "short" }),
    price: h.price,
  }));
  const trending = history[history.length - 1].price >= history[0].price;
  return (
    <div className="mt-3 -mx-2">
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(chartData.length / 4)} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={35} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ fontSize: 11, textTransform: "lowercase" }} formatter={(v: number) => [v.toFixed(2), "price"]} />
          <Line type="monotone" dataKey="price" stroke={trending ? "#6ab023" : "#ef4444"} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

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
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);

  const { data: markets = [], isLoading } = useQuery<CarbonMarket[]>({
    queryKey: ["/api/markets"],
  });

  // auto-select first market when data loads
  const activeMarketId = selectedMarketId ?? (markets.length > 0 ? markets[0].id : null);
  const selectedMarket = markets.find((m) => m.id === activeMarketId);

  const { data: history = [], isLoading: historyLoading } = useQuery<HistoryPoint[]>({
    queryKey: ["/api/markets", activeMarketId, "history"],
    queryFn: async () => { const r = await apiRequest("GET", `/api/markets/${activeMarketId}/history`); return r.json(); },
    enabled: !!activeMarketId,
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
      if (activeMarketId) {
        queryClient.invalidateQueries({ queryKey: ["/api/markets", activeMarketId, "history"] });
      }
    },
  });

  const trendingUp = markets.filter((m) => m.trendUp).length;
  const trendingDown = markets.filter((m) => !m.trendUp).length;

  // format history for chart
  const chartData = history.map((h) => ({
    date: new Date(h.recordedAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
    price: h.price,
  }));

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

      {/* summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="markets tracked" value={String(markets.length)} icon={BarChart3} subtitle="carbon credit markets" />
        <StatCard label="trending up" value={String(trendingUp)} icon={ArrowUpRight} subtitle="positive momentum" />
        <StatCard label="trending down" value={String(trendingDown)} icon={ArrowDownRight} subtitle="negative momentum" />
      </div>

      {/* last updated */}
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
            <Card
              key={market.id}
              className={`border cursor-pointer transition-all ${
                activeMarketId === market.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/30"
              }`}
              onClick={() => setSelectedMarketId(market.id)}
              data-testid={`card-market-${market.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold lowercase">{market.name}</h3>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
                <MiniChart marketId={market.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* price history line chart */}
      {activeMarketId && selectedMarket && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold lowercase mb-4">
            {selectedMarket.name} — 52 week price history
          </h2>
          <Card className="border border-border">
            <CardContent className="p-4">
              {historyLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground lowercase">
                  no history data — run seed or refresh prices to generate data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, textTransform: "lowercase" }}
                      formatter={(value: number) => [value.toFixed(2), "price"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#6ab023"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#6ab023" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
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
