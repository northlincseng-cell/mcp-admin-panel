import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Handshake } from "lucide-react";

export default function Offers() {
  const { data: offers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/offers"],
  });

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
  ];

  return (
    <div>
      <PageHeader title="offers" icon={Handshake} breadcrumb="retailers & products / gs offer model" />

      <DataTable
        columns={columns}
        data={offers}
        isLoading={isLoading}
        searchKey="retailerName"
        searchPlaceholder="filter by retailer or product..."
        emptyMessage="no offers configured"
      />
    </div>
  );
}
