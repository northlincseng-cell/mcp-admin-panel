import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Handshake, Pencil, Trash2, BarChart3, Activity, TrendingUp, Download } from "lucide-react";
import { exportToCsv } from "@/lib/export";
import type { Retailer, Product } from "@shared/schema";

export default function Offers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: offers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/offers"],
  });

  const { data: retailers = [] } = useQuery<Retailer[]>({
    queryKey: ["/api/retailers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/offers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/offers/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/offers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
  });

  const fields: FieldDef[] = useMemo(
    () => [
      {
        key: "retailerId",
        label: "retailer",
        type: "select" as const,
        required: true,
        options: retailers.map((r) => ({
          label: r.name,
          value: String(r.id),
        })),
      },
      {
        key: "productId",
        label: "product",
        type: "select" as const,
        required: true,
        options: products.map((p) => ({
          label: `${p.name} — ${p.sku}`,
          value: String(p.id),
        })),
      },
      { key: "retailerGs", label: "retailer gs", type: "number" as const },
      {
        key: "gsMatchType",
        label: "match type",
        type: "select" as const,
        options: [
          { label: "fixed", value: "fixed" },
          { label: "percentage", value: "percentage" },
          { label: "match", value: "match" },
        ],
      },
      { key: "priceLocal", label: "price local", placeholder: "e.g. £9.99" },
      {
        key: "status",
        label: "status",
        type: "select" as const,
        options: [
          { label: "active", value: "active" },
          { label: "pending", value: "pending" },
          { label: "inactive", value: "inactive" },
        ],
      },
    ],
    [retailers, products],
  );

  // Stats
  const totalOffers = offers.length;
  const activeOffers = offers.filter((o) => o.status === "active").length;
  const avgGs =
    totalOffers > 0
      ? (
          offers.reduce((sum, o) => sum + (Number(o.gsTotal) || 0), 0) /
          totalOffers
        ).toFixed(1)
      : "0";

  const columns: Column<any>[] = [
    { key: "retailerName", label: "retailer", sortable: true },
    { key: "productName", label: "product", sortable: true },
    { key: "brand", label: "brand", sortable: true },
    { key: "baseGs", label: "base gs", sortable: true },
    { key: "retailerGs", label: "retailer gs" },
    {
      key: "gsTotal",
      label: "total gs",
      sortable: true,
      render: (r) => <span className="font-semibold">{r.gsTotal ?? "—"}</span>,
    },
    { key: "gsMatchType", label: "match type" },
    {
      key: "status",
      label: "status",
      render: (r) => <StatusBadge status={r.status} />,
    },
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
              if (confirm("delete this offer?")) deleteMutation.mutate(r.id);
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
      <PageHeader
        title="offers"
        icon={Handshake}
        breadcrumb="retailers & products / gs offer model"
      >
        <Button
          variant="outline"
          size="sm"
          className="lowercase"
          data-testid="button-export-csv"
          onClick={() =>
            exportToCsv(
              offers.map((o: any) => ({
                retailer: o.retailerName,
                product: o.productName,
                brand: o.brand,
                baseGs: o.baseGs,
                retailerGs: o.retailerGs,
                totalGs: o.gsTotal,
                matchType: o.gsMatchType,
                status: o.status,
              })),
              "offers",
              [
                { key: "retailer", label: "retailer" },
                { key: "product", label: "product" },
                { key: "brand", label: "brand" },
                { key: "baseGs", label: "base gs" },
                { key: "retailerGs", label: "retailer gs" },
                { key: "totalGs", label: "total gs" },
                { key: "matchType", label: "match type" },
                { key: "status", label: "status" },
              ],
            )
          }
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          export csv
        </Button>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="total offers"
          value={String(totalOffers)}
          icon={BarChart3}
          subtitle="all configured offers"
        />
        <StatCard
          label="active offers"
          value={String(activeOffers)}
          icon={Activity}
          subtitle="currently active"
        />
        <StatCard
          label="avg gs per offer"
          value={avgGs}
          icon={TrendingUp}
          subtitle="mean total gs"
        />
      </div>

      <DataTable
        columns={columns}
        data={offers}
        isLoading={isLoading}
        searchKey="retailerName"
        searchPlaceholder="filter by retailer or product..."
        emptyMessage="no offers configured"
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        addLabel="add offer"
      />

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "edit offer" : "add offer"}
        fields={fields}
        initialData={
          editing
            ? {
                retailerId: String(editing.retailerId),
                productId: String(editing.productId),
                retailerGs: editing.retailerGs ?? 0,
                gsMatchType: editing.gsMatchType ?? "fixed",
                priceLocal: editing.priceLocal ?? "",
                status: editing.status ?? "active",
              }
            : undefined
        }
        onSubmit={(data) =>
          editing ? updateMutation.mutate(data) : createMutation.mutate(data)
        }
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
