import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import type { Product } from "@shared/schema";

const fields: FieldDef[] = [
  { key: "name", label: "name", required: true },
  { key: "sku", label: "sku", required: true },
  { key: "brand", label: "brand", required: true },
  { key: "category", label: "category", placeholder: "grocery" },
  { key: "baseGs", label: "base gs", type: "number" },
  { key: "carbonPct", label: "carbon %", type: "number" },
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
  { key: "notes", label: "notes", type: "textarea" },
];

export default function Products() {
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/products/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const columns: Column<Product>[] = [
    {
      key: "name",
      label: "name",
      sortable: true,
      render: (p) => (
        <button
          className="font-medium text-primary hover:underline lowercase"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/products/${p.id}`);
          }}
          data-testid={`link-product-${p.id}`}
        >
          {p.name}
        </button>
      ),
    },
    { key: "sku", label: "sku" },
    { key: "brand", label: "brand", sortable: true },
    { key: "category", label: "category", sortable: true },
    { key: "baseGs", label: "base gs", sortable: true },
    {
      key: "carbonPct",
      label: "carbon %",
      render: (p) => <span>{p.carbonPct}%</span>,
    },
    {
      key: "verified",
      label: "verified",
      render: (p) =>
        p.verified ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        ),
    },
    {
      key: "status",
      label: "status",
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "actions",
      label: "",
      render: (p) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(p); setDialogOpen(true); }} data-testid={`button-edit-${p.id}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("delete this product?")) deleteMutation.mutate(p.id); }} data-testid={`button-delete-${p.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="products" icon={Package} breadcrumb="retailers & products" />

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="search products..."
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        addLabel="add product"
      />

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "edit product" : "add product"}
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
