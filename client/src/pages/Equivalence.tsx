import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Scale, Pencil, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Equivalence } from "@shared/schema";

const COLORS = ["hsl(88, 68%, 42%)", "hsl(140, 50%, 38%)", "hsl(50, 70%, 50%)", "hsl(200, 60%, 50%)"];

const editFields: FieldDef[] = [
  { key: "dimension", label: "dimension", required: true },
  { key: "percentage", label: "percentage", type: "number" },
  { key: "gsValue", label: "gs value" },
  { key: "description", label: "description", type: "textarea" },
];

export default function EquivalencePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Equivalence | null>(null);

  const { data: config = [], isLoading } = useQuery<Equivalence[]>({
    queryKey: ["/api/equivalence"],
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/equivalence/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equivalence"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const chartData = config.map((c) => ({
    name: c.dimension,
    value: c.percentage ?? 0,
  }));

  const columns: Column<Equivalence>[] = [
    { key: "dimension", label: "dimension", sortable: true },
    {
      key: "percentage",
      label: "percentage",
      render: (c) => <span className="font-semibold">{c.percentage}%</span>,
    },
    { key: "gsValue", label: "gs value" },
    { key: "description", label: "description", className: "max-w-[300px] truncate" },
    {
      key: "actions",
      label: "",
      render: (c) => (
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(c); setDialogOpen(true); }} data-testid={`button-edit-${c.id}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="equivalence engine" icon={Scale} breadcrumb="engines" />

      <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm lowercase text-amber-800 dark:text-amber-300">
          minimum 10% must come from verified carbon reduction. this is non-negotiable.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Stacked bar */}
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium lowercase">% breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[{ name: "composition", ...Object.fromEntries(chartData.map((c) => [c.name, c.value])) }]} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    {chartData.map((c, i) => (
                      <Bar key={c.name} dataKey={c.name} stackId="a" fill={COLORS[i % COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Donut chart */}
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium lowercase">composition</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={columns}
            data={config}
            isLoading={isLoading}
            emptyMessage="no equivalence dimensions configured"
          />
        </>
      )}

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="edit equivalence dimension"
        fields={editFields}
        initialData={editing ?? undefined}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
