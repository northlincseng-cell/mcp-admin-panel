import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Target, BarChart3, TrendingUp, AlertTriangle, Award } from "lucide-react";
import type { Deal, ValueProtection } from "@shared/schema";

// ── scoring logic ────────────────────────────────────

interface DimensionScore {
  name: string;
  score: number;
  weight: number;
}

function computeDimensionScores(deal: Deal, dimensions: ValueProtection[]): DimensionScore[] {
  const dimMap = new Map(dimensions.map((d) => [d.dimension.toLowerCase(), d.weight ?? 0]));

  const getWeight = (key: string) => dimMap.get(key) || 1;

  // carbon verification: proportional to deal.score, 90+ if >= 80
  const carbonScore = (deal.score ?? 0) >= 80
    ? Math.min(90 + Math.floor(((deal.score ?? 0) - 80) / 2), 100)
    : Math.round(((deal.score ?? 0) / 80) * 85);

  // value integrity: lower if cascade flagged
  const integrityScore = deal.cascadeFlagged ? 55 : 92;

  // regulatory compliance: active=100, pending=70, else 50
  const regulatoryScore = deal.status === "active" ? 100 : deal.status === "pending" ? 70 : 50;

  // market alignment: based on volume string, parse numeric portion
  const volNum = parseFloat(String(deal.volume ?? "").replace(/[^0-9.]/g, "")) || 0;
  const marketScore = Math.min(Math.round(60 + volNum * 0.5), 95);

  // social impact: cause-based=95, corporate=80, other=70
  const dealType = (deal.type ?? "corporate").toLowerCase();
  const socialScore = dealType.includes("cause") ? 95 : dealType === "corporate" ? 80 : 70;

  // governance: level-based (higher level = higher score)
  const level = deal.level ?? 1;
  const governanceScore = Math.min(60 + level * 10, 98);

  return [
    { name: "carbon verification", score: carbonScore, weight: getWeight("carbon verification") },
    { name: "value integrity", score: integrityScore, weight: getWeight("value integrity") },
    { name: "regulatory compliance", score: regulatoryScore, weight: getWeight("regulatory compliance") },
    { name: "market alignment", score: marketScore, weight: getWeight("market alignment") },
    { name: "social impact", score: socialScore, weight: getWeight("social impact") },
    { name: "governance", score: governanceScore, weight: getWeight("governance") },
  ];
}

function weightedOverall(dims: DimensionScore[]): number {
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  if (totalWeight === 0) return Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);
  return Math.round(dims.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight);
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

const BAND_COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444"];

// ── component ────────────────────────────────────────

export default function DealScoring() {
  const [selectedDealId, setSelectedDealId] = useState<string>("");

  const { data: deals = [], isLoading: loadingDeals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: dimensions = [] } = useQuery<ValueProtection[]>({
    queryKey: ["/api/value-protection"],
  });

  // compute scores for every deal
  const scoredDeals = useMemo(() => {
    return deals.map((deal) => {
      const dims = computeDimensionScores(deal, dimensions);
      return { deal, dims, overall: weightedOverall(dims) };
    });
  }, [deals, dimensions]);

  // selected deal for simulator
  const selectedScored = useMemo(() => {
    if (!selectedDealId) return scoredDeals[0] ?? null;
    return scoredDeals.find((s) => String(s.deal.id) === selectedDealId) ?? null;
  }, [selectedDealId, scoredDeals]);

  // stats
  const totalScored = scoredDeals.length;
  const avgScore = totalScored > 0
    ? Math.round(scoredDeals.reduce((s, d) => s + d.overall, 0) / totalScored)
    : 0;
  const highestScorer = scoredDeals.reduce<typeof scoredDeals[0] | null>(
    (best, cur) => (!best || cur.overall > best.overall ? cur : best),
    null,
  );
  const needsReview = scoredDeals.filter((s) => s.overall < 60).length;

  // distribution chart data
  const distributionData = useMemo(() => {
    const bands = [
      { name: "excellent", min: 80, max: 100, count: 0 },
      { name: "good", min: 60, max: 79, count: 0 },
      { name: "review", min: 40, max: 59, count: 0 },
      { name: "concern", min: 0, max: 39, count: 0 },
    ];
    scoredDeals.forEach((s) => {
      const band = bands.find((b) => s.overall >= b.min && s.overall <= b.max);
      if (band) band.count++;
    });
    return bands;
  }, [scoredDeals]);

  // deals table columns
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
    {
      key: "type",
      label: "type",
      render: (d) => <StatusBadge status={d.type ?? "corporate"} />,
    },
  ];

  return (
    <div>
      <PageHeader title="deal scoring" icon={Target} breadcrumb="engines" />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="deals scored" value={String(totalScored)} icon={BarChart3} subtitle="total deals analyzed" />
        <StatCard label="avg score" value={String(avgScore)} icon={TrendingUp} subtitle="weighted average" />
        <StatCard
          label="highest scorer"
          value={highestScorer ? highestScorer.deal.name : "—"}
          icon={Award}
          subtitle={highestScorer ? `score: ${highestScorer.overall}` : "no deals"}
        />
        <StatCard label="needs review" value={String(needsReview)} icon={AlertTriangle} subtitle="score below 60" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Live scoring simulator */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium lowercase">live scoring engine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground lowercase block mb-1.5">select deal</label>
              <Select
                value={selectedDealId || (scoredDeals[0] ? String(scoredDeals[0].deal.id) : "")}
                onValueChange={setSelectedDealId}
              >
                <SelectTrigger className="h-9 text-sm lowercase" data-testid="select-deal">
                  <SelectValue placeholder="choose a deal..." />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)} className="lowercase">
                      {d.name} {d.flag || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedScored ? (
              <>
                <div className="space-y-3">
                  {selectedScored.dims.map((dim) => (
                    <div key={dim.name} className="flex items-center gap-3">
                      <div className="w-40 text-sm lowercase truncate">{dim.name}</div>
                      <div className="flex-1">
                        <Progress value={dim.score} className="h-2.5" />
                      </div>
                      <span className={`text-sm font-semibold w-10 text-right ${scoreColor(dim.score)}`}>
                        {dim.score}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground lowercase">overall weighted score</span>
                  <span className={`text-lg font-bold ${scoreColor(selectedScored.overall)}`}>
                    {selectedScored.overall}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground lowercase py-4">no deals available</p>
            )}
          </CardContent>
        </Card>

        {/* Score distribution chart */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium lowercase">score distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground lowercase mb-3">
              deals by score band
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distributionData.map((_, i) => (
                    <Cell key={i} fill={BAND_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Deals table */}
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
