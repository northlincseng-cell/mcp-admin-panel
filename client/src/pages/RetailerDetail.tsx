import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Store, Pencil, Trash2 } from "lucide-react";
import type { Retailer, Product } from "@shared/schema";

export default function RetailerDetail() {
  const [, params] = useRoute("/retailers/:id");
  const id = params?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);

  const { data: retailer, isLoading: loadingRetailer } = useQuery<Retailer>({
    queryKey: ["/api/retailers", id],
    enabled: !!id,
  });

  const { data: offers = [], isLoading: loadingOffers } = useQuery<any[]>({
    queryKey: [`/api/retailers/${id}/products`],
    enabled: !!id,
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/offers", {
        ...data,
        retailerId: Number(id),
        gsTotal: (Number(data.retailerGs) || 0) + (Number(data.baseGs) || 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/retailers/${id}/products`] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/offers/${editingOffer?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/retailers/${id}/products`] });
      setDialogOpen(false);
      setEditingOffer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (offerId: number) => apiRequest("DELETE", `/api/offers/${offerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/retailers/${id}/products`] });
    },
  });

  const offerFields: FieldDef[] = [
    {
      key: "productId",
      label: "product",
      type: "select",
      options: allProducts.map((p) => ({
        label: `${p.name} (${p.brand})`,
        value: String(p.id),
      })),
    },
    { key: "retailerGs", label: "retailer gs top-up", type: "number" },
    { key: "priceLocal", label: "shelf price" },
    {
      key: "gsMatchType",
      label: "match type",
      type: "select",
      options: [
        { label: "fixed", value: "fixed" },
        { label: "percentage", value: "percentage" },
        { label: "match", value: "match" },
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

  const columns: Column<any>[] = [
    { key: "productName", label: "product", sortable: true },
    { key: "brand", label: "brand" },
    { key: "baseGs", label: "base gs" },
    { key: "retailerGs", label: "retailer gs" },
    { key: "gsTotal", label: "total gs", render: (r) => <span className="font-semibold">{r.gsTotal ?? "—"}</span> },
    { key: "priceLocal", label: "price" },
    { key: "status", label: "status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingOffer(r); setDialogOpen(true); }} data-testid={`button-edit-offer-${r.id}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("remove this product?")) deleteMutation.mutate(r.id); }} data-testid={`button-delete-offer-${r.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (loadingRetailer) {
    return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div>
      <PageHeader title={retailer?.name ?? "retailer"} icon={Store} breadcrumb="retailers & products / retailer detail" />

      <Card className="mb-4 border border-border">
        <CardContent className="p-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground lowercase">code</span>
            <p className="font-medium">{retailer?.code}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground lowercase">country</span>
            <p className="font-medium">{retailer?.flag} {retailer?.country}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground lowercase">match policy</span>
            <p className="font-medium lowercase">{retailer?.gsMatchPolicy}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground lowercase">status</span>
            <div className="mt-0.5">{retailer && <StatusBadge status={retailer.status} />}</div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={offers}
        isLoading={loadingOffers}
        searchKey="productName"
        searchPlaceholder="search products..."
        onAdd={() => { setEditingOffer(null); setDialogOpen(true); }}
        addLabel="add product"
        emptyMessage="no products assigned to this retailer"
      />

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingOffer ? "edit product offer" : "add product to retailer"}
        fields={offerFields}
        initialData={editingOffer ?? undefined}
        onSubmit={(data) => {
          if (editingOffer) {
            updateMutation.mutate(data);
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
