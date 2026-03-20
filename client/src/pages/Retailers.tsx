import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Pencil, Trash2 } from "lucide-react";
import type { Retailer } from "@shared/schema";

const fields: FieldDef[] = [
  { key: "name", label: "name", required: true },
  { key: "code", label: "code", required: true },
  { key: "country", label: "country", placeholder: "UK" },
  { key: "flag", label: "flag emoji", placeholder: "🇬🇧" },
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
  {
    key: "gsMatchPolicy",
    label: "gs match policy",
    type: "select",
    options: [
      { label: "none", value: "none" },
      { label: "fixed", value: "fixed" },
      { label: "percentage", value: "percentage" },
    ],
  },
  { key: "gsMatchValue", label: "gs match value", type: "number" },
  { key: "contactEmail", label: "contact email" },
  { key: "notes", label: "notes", type: "textarea" },
];

export default function Retailers() {
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Retailer | null>(null);

  const { data: retailers = [], isLoading } = useQuery<Retailer[]>({
    queryKey: ["/api/retailers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/retailers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/retailers/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/retailers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retailers"] });
    },
  });

  const columns: Column<Retailer>[] = [
    {
      key: "name",
      label: "name",
      sortable: true,
      render: (r) => (
        <button
          className="font-medium text-primary hover:underline lowercase"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/retailers/${r.id}`);
          }}
          data-testid={`link-retailer-${r.id}`}
        >
          {r.name}
        </button>
      ),
    },
    { key: "code", label: "code", sortable: true },
    { key: "country", label: "country", sortable: true },
    { key: "flag", label: "flag" },
    {
      key: "status",
      label: "status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    { key: "gsMatchPolicy", label: "match policy" },
    { key: "gsMatchValue", label: "match value" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setEditing(r);
              setDialogOpen(true);
            }}
            data-testid={`button-edit-${r.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive"
            onClick={() => {
              if (confirm("delete this retailer?")) deleteMutation.mutate(r.id);
            }}
            data-testid={`button-delete-${r.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="retailers" icon={Store} breadcrumb="retailers & products" />

      <DataTable
        columns={columns}
        data={retailers}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="search retailers..."
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        addLabel="add retailer"
      />

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "edit retailer" : "add retailer"}
        fields={fields}
        initialData={editing ?? undefined}
        onSubmit={(data) =>
          editing ? updateMutation.mutate(data) : createMutation.mutate(data)
        }
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
