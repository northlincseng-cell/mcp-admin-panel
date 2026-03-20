import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import type { RegulatoryUpdate } from "@shared/schema";

const fields: FieldDef[] = [
  { key: "title", label: "title", required: true },
  { key: "jurisdiction", label: "jurisdiction" },
  { key: "category", label: "category" },
  { key: "date", label: "date" },
  { key: "summary", label: "summary", type: "textarea" },
  {
    key: "impact",
    label: "impact",
    type: "select",
    options: [
      { label: "high", value: "high" },
      { label: "medium", value: "medium" },
      { label: "low", value: "low" },
    ],
  },
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
];

export default function RegulatoryUpdates() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RegulatoryUpdate | null>(null);

  const { data: updates = [], isLoading } = useQuery<RegulatoryUpdate[]>({
    queryKey: ["/api/regulatory"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/regulatory", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/regulatory/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/regulatory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory"] });
    },
  });

  const columns: Column<RegulatoryUpdate>[] = [
    { key: "title", label: "title", sortable: true },
    { key: "jurisdiction", label: "jurisdiction", sortable: true },
    { key: "category", label: "category" },
    { key: "date", label: "date", sortable: true },
    {
      key: "impact",
      label: "impact",
      render: (r) => <StatusBadge status={r.impact ?? "medium"} />,
    },
    {
      key: "status",
      label: "status",
      render: (r) => <StatusBadge status={r.status ?? "active"} />,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(r); setDialogOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("delete?")) deleteMutation.mutate(r.id); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="regulatory updates" icon={BookOpen} breadcrumb="data feeds" />

      <DataTable
        columns={columns}
        data={updates}
        isLoading={isLoading}
        searchKey="title"
        searchPlaceholder="search updates..."
        onAdd={() => { setEditing(null); setDialogOpen(true); }}
        addLabel="add update"
        emptyMessage="no regulatory updates"
      />

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "edit regulatory update" : "add regulatory update"}
        fields={fields}
        initialData={editing ?? undefined}
        onSubmit={(data) => editing ? updateMutation.mutate(data) : createMutation.mutate(data)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
