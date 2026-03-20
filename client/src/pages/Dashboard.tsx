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
} from "recharts";
import type { ChangeLogEntry } from "@shared/schema";

const monthlyData = [
  { month: "sep", gs: 68 },
  { month: "oct", gs: 82 },
  { month: "nov", gs: 71 },
  { month: "dec", gs: 95 },
  { month: "jan", gs: 110 },
  { month: "feb", gs: 98 },
  { month: "mar", gs: 124 },
];

const revenueByCountry = [
  { country: "uk", revenue: 340 },
  { country: "germany", revenue: 180 },
  { country: "france", revenue: 120 },
  { country: "netherlands", revenue: 85 },
  { country: "ireland", revenue: 62 },
  { country: "sweden", revenue: 45 },
  { country: "denmark", revenue: 28 },
];

export default function Dashboard() {
  const { data: dashboard, isLoading: loadingStats } = useQuery<any>({
    queryKey: ["/api/dashboard"],
  });

  const { data: changelog, isLoading: loadingLog } = useQuery<ChangeLogEntry[]>({
    queryKey: ["/api/changelog"],
  });

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
              value={dashboard?.totalGsIssued ?? "847.3M"}
              icon={Square}
              subtitle="all time"
            />
            <StatCard
              label="active countries"
              value={dashboard?.activeCountries ?? "7/15"}
              icon={Globe}
              subtitle="jurisdictions live"
            />
            <StatCard
              label="active deals"
              value={String(dashboard?.activeDeals ?? 23)}
              icon={Handshake}
              subtitle="in pipeline"
            />
            <StatCard
              label="avg protection score"
              value={dashboard?.avgProtectionScore ?? "94.2"}
              icon={Shield}
              subtitle="value protection"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium lowercase">gs issuance by month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
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
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                  }}
                />
                <Bar
                  dataKey="gs"
                  fill="hsl(88, 68%, 42%)"
                  radius={[3, 3, 0, 0]}
                  name="gs (millions)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium lowercase">revenue by country</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByCountry} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="country"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(140, 50%, 38%)"
                  radius={[0, 3, 3, 0]}
                  name="revenue (£k)"
                />
              </BarChart>
            </ResponsiveContainer>
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
