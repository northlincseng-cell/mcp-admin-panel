import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Square,
  Globe,
  Handshake,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ChangeLogEntry, Deal, SystemStatus } from "@shared/schema";

const MGS_GREEN = "hsl(88, 68%, 42%)";

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid hsl(var(--border))",
  backgroundColor: "hsl(var(--card))",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  pending: "#eab308",
  inactive: "#64748b",
  rejected: "#ef4444",
};

const HEALTH_DOT: Record<string, string> = {
  operational: "bg-green-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
};

function formatGs(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}m`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
  return String(val);
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export default function Dashboard() {
  const { data: dashboard, isLoading: loadingStats } = useQuery<any>({
    queryKey: ["/api/dashboard"],
  });

  const { data: changelog, isLoading: loadingLog } = useQuery<ChangeLogEntry[]>({
    queryKey: ["/api/changelog"],
  });

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: systemServices = [], isLoading: loadingHealth } = useQuery<SystemStatus[]>({
    queryKey: ["/api/system-status"],
  });

  // Activity by month — group changelog entries by month
  const activityByMonth = useMemo(() => {
    const entries = changelog ?? [];
    const counts = new Map<string, number>();

    entries.forEach((e) => {
      if (!e.createdAt) return;
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    // Sort keys chronologically, take last 7
    const sorted = Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7);

    // Pad to at least 3 entries
    if (sorted.length < 3) {
      const now = new Date();
      for (let i = sorted.length; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        if (!sorted.find(([k]) => k === key)) {
          sorted.push([key, 0]);
        }
      }
      sorted.sort(([a], [b]) => a.localeCompare(b));
    }

    return sorted.map(([key, count]) => {
      const month = parseInt(key.split("-")[1], 10);
      return { month: MONTH_NAMES[month], actions: count };
    });
  }, [changelog]);

  // Deals by country
  const dealsByCountry = useMemo(() => {
    const counts = new Map<string, number>();
    deals.forEach((d) => {
      const country = (d.country || "unknown").toLowerCase();
      counts.set(country, (counts.get(country) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, count]) => ({ country, deals: count }));
  }, [deals]);

  // Pipeline status — deals by status for pie chart
  const pipelineData = useMemo(() => {
    const counts = new Map<string, number>();
    deals.forEach((d) => {
      const s = (d.status || "pending").toLowerCase();
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([status, count]) => ({
      name: status,
      value: count,
      fill: STATUS_COLORS[status] || "#64748b",
    }));
  }, [deals]);

  return (
    <div>
      <PageHeader title="dashboard" icon={LayoutDashboard} breadcrumb="overview" />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <StatCard
              label="total gs issued"
              value={dashboard?.offers?.totalGs != null ? formatGs(dashboard.offers.totalGs) : "0"}
              icon={Square}
              subtitle="all time"
            />
            <StatCard
              label="active countries"
              value={`${dashboard?.countries?.active ?? 0}/${dashboard?.countries?.total ?? 0}`}
              icon={Globe}
              subtitle="jurisdictions live"
            />
            <StatCard
              label="active deals"
              value={String(dashboard?.deals?.active ?? 0)}
              icon={Handshake}
              subtitle="in pipeline"
            />
            <StatCard
              label="avg protection score"
              value={dashboard?.avgProtectionScore ?? "—"}
              icon={Shield}
              subtitle="value protection"
            />
          </>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium lowercase">activity by month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar
                  dataKey="actions"
                  fill={MGS_GREEN}
                  radius={[3, 3, 0, 0]}
                  name="actions"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium lowercase">deals by country</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dealsByCountry} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="country"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar
                  dataKey="deals"
                  fill="hsl(140, 50%, 38%)"
                  radius={[0, 3, 3, 0]}
                  name="deals"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Pipeline status pie */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium lowercase">pipeline status</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData.length === 0 ? (
              <p className="text-sm text-muted-foreground lowercase py-8 text-center">no deals</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pipelineData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pipelineData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span className="lowercase flex-1">{entry.name}</span>
                      <span className="font-semibold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System health */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium lowercase">system health</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : systemServices.length === 0 ? (
              <p className="text-sm text-muted-foreground lowercase py-8 text-center">no services</p>
            ) : (
              <div className="space-y-2">
                {systemServices.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-center gap-3 py-1.5 text-sm border-b border-border/50 last:border-0"
                    data-testid={`health-${svc.id}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${HEALTH_DOT[svc.status ?? "operational"] ?? HEALTH_DOT.down}`} />
                    <span className="flex-1 lowercase">{svc.service}</span>
                    <span className="text-xs text-muted-foreground lowercase">{svc.uptime}</span>
                    <span className="text-xs text-muted-foreground lowercase">{svc.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium lowercase">recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLog ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {(changelog ?? []).slice(0, 8).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 py-1.5 text-sm border-b border-border/50 last:border-0"
                  data-testid={`activity-${entry.id}`}
                >
                  <StatusBadge status={entry.action} />
                  <span className="text-muted-foreground lowercase">{entry.section}</span>
                  <span className="flex-1 truncate lowercase">{entry.detail}</span>
                  <span className="text-xs text-muted-foreground lowercase">
                    {entry.userName}
                  </span>
                </div>
              ))}
              {(!changelog || changelog.length === 0) && (
                <p className="text-sm text-muted-foreground lowercase py-4 text-center">
                  no recent activity
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
