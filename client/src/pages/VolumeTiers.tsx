import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { CrudDialog, type FieldDef } from "@/components/shared/CrudDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Layers, Pencil } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { VolumeTier } from "@shared/schema";

const COLORS = ["hsl(88, 68%, 42%)", "hsl(140, 50%, 38%)", "hsl(160, 50%, 40%)", "hsl(50, 70%, 50%)"];

const EXCHANGE_RATES: Record<string, number> = {
  GBP: 1, EUR: 1.16, USD: 1.33, AUD: 1.97, SGD: 1.73, NZD: 2.15, JPY: 195, ZAR: 24.5, CAD: 1.84, CHF: 1.12,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£", EUR: "€", USD: "$", AUD: "A$", SGD: "S$", NZD: "NZ$", JPY: "¥", ZAR: "R", CAD: "C$", CHF: "CHF",
};

function fmtPrice(n: number | null | undefined, symbol = "£"): string {
  if (n === null || n === undefined || n === 0) return "—";
  if (n < 0.01) return `${symbol}${n.toFixed(4)}`;
  return `${symbol}${n.toFixed(3)}`;
}

const fields: FieldDef[] = [
  { key: "name", label: "tier name", required: true },
  { key: "threshold", label: "volume threshold" },
  { key: "pricePerGs", label: "price per gs" },
  { key: "discount", label: "discount" },
  { key: "description", label: "description", type: "textarea" },
];

export default function VolumeTiers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VolumeTier | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState("GBP");

  const { data: tiers = [], isLoading } = useQuery<VolumeTier[]>({
    queryKey: ["/api/tiers"],
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/tiers/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tiers"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const pieData = tiers.map((t) => ({
    name: t.name,
    value: parseInt(t.threshold?.replace(/[^\d]/g, "") || "0") || 1,
  }));

  const isConverted = displayCurrency !== "GBP";
  const sym = CURRENCY_SYMBOLS[displayCurrency] || "£";
  const rate = EXCHANGE_RATES[displayCurrency] || 1;

  return (
    <div>
      <PageHeader title="volume tiers" icon={Layers} breadcrumb="commercial" />

      {/* display currency selector */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs text-muted-foreground lowercase">display currency:</span>
        <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
          <SelectTrigger className="h-8 w-[140px] text-xs" data-testid="select-display-currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CURRENCY_SYMBOLS).map(([code, s]) => (
              <SelectItem key={code} value={code} className="text-xs">{code} ({s})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isConverted && (
          <span className="text-[10px] text-muted-foreground lowercase italic">
            indicative rates only — not for trading
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {tiers.map((tier) => (
            <Card key={tier.id} className="border border-border" data-testid={`card-tier-${tier.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold lowercase">{tier.name}</h3>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(tier); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground lowercase">threshold</span>
                    <p className="font-medium">{tier.threshold || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground lowercase">price/gs</span>
                    <p className="font-medium">{tier.pricePerGs || "—"}</p>
                    {isConverted && tier.priceNumeric && (
                      <p className="text-muted-foreground text-[10px]">
                        ≈ {fmtPrice(tier.priceNumeric * rate, sym)}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground lowercase">discount</span>
                    <p className="font-medium">{tier.discount || "—"}</p>
                  </div>
                </div>
                {tier.description && (
                  <p className="text-xs text-muted-foreground mt-2 lowercase">{tier.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tiers.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium lowercase">tier distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="edit volume tier"
        fields={fields}
        initialData={editing ?? undefined}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
