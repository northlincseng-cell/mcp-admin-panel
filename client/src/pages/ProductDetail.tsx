import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle, XCircle } from "lucide-react";
import type { Product } from "@shared/schema";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const id = params?.id;

  const { data: product, isLoading: loadingProduct } = useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });

  const { data: retailers = [], isLoading: loadingRetailers } = useQuery<any[]>({
    queryKey: [`/api/products/${id}/retailers`],
    enabled: !!id,
  });

  const columns: Column<any>[] = [
    { key: "retailerName", label: "retailer", sortable: true },
    { key: "retailerGs", label: "retailer gs" },
    { key: "gsTotal", label: "total gs", render: (r) => <span className="font-semibold">{r.gsTotal ?? "—"}</span> },
    { key: "priceLocal", label: "price" },
    { key: "gsMatchType", label: "match type" },
    { key: "status", label: "status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  if (loadingProduct) {
    return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div>
      <PageHeader title={product?.name ?? "product"} icon={Package} breadcrumb="retailers & products / product detail" />

      <Card className="mb-4 border border-border">
        <CardContent className="p-4 grid grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground lowercase">sku</span>
            <p className="font-medium">{product?.sku}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground lowercase">brand</span>
            <p className="font-medium">{product?.brand}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground lowercase">base gs</span>
            <p className="font-medium">{product?.baseGs}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground lowercase">carbon %</span>
            <p className="font-medium">{product?.carbonPct}%</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground lowercase">verified</span>
            <div className="mt-0.5">
              {product?.verified ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold lowercase mb-3">where can i buy this?</h2>

      <DataTable
        columns={columns}
        data={retailers}
        isLoading={loadingRetailers}
        searchKey="retailerName"
        searchPlaceholder="search retailers..."
        emptyMessage="no retailers stock this product"
      />
    </div>
  );
}
