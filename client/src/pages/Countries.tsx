import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Globe, Pencil, Trash2 } from "lucide-react";
import type { Country } from "@shared/schema";

const fields: FieldDef[] = [
  { key: "name", label: "country name", required: true },
  { key: "flag", label: "flag emoji", placeholder: "🇬🇧" },
  { key: "carbonReference", label: "carbon reference" },
  { key: "gsPrice", label: "gs price" },
  { key: "floorPrice", label: "floor price" },
  { key: "complianceFramework", label: "compliance framework" },
  { key: "readiness", label: "readiness score (0-100)", type: "number" },
  {
    key: "status",
    label: "status",
    type: "select",
    options: [
      { label: "active", value: "active" },
      { label: "pending", value: "pending" },
      { label: "planned", value: "planned" },
    ],
  },
];

export default function Countries() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Country | null>(null);

  const { data: countries = [], isLoading } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/countries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/countries/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/countries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
    },
  });

  const columns: Column<Country>[] = [
    { key: "flag", label: "flag" },
    { key: "name", label: "name", sortable: true },
    { key: "carbonReference", label: "carbon reference" },
    { key: "gsPrice", label: "gs price", sortable: true },
    { key: "floorPrice", label: "floor price" },
    { key: "complianceFramework", label: "compliance" },
    {
      key: "readiness",
      label: "readiness",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={c.readiness ?? 0} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground w-8">{c.readiness}%</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "status",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      label: "",
      render: (c) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(c); setDialogOpen(true); }} data-testid={`button-edit-${c.id}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("delete?")) deleteMutation.mutate(c.id); }} data-testid={`button-delete-${c.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="countries" icon={Globe} breadcrumb="commercial / jurisdiction defaults" />

      <DataTable
        columns={columns}
        data={countries}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="search countries..."
        onAdd={() => { setEditing(null); setDialogOpen(true); }}
        addLabel="add country"
      />

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "edit country" : "add country"}
        fields={fields}
        initialData={editing ?? undefined}
        onSubmit={(data) => editing ? updateMutation.mutate(data) : createMutation.mutate(data)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
