import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Plus, Pencil, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Deal, VolumeTier } from "@shared/schema";

/** Format a numeric price to display string */
function fmtPrice(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return "—";
  if (n < 0.01) return `£${n.toFixed(4)}`;
  return `£${n.toFixed(3)}`;
}

export default function Deals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: tiers = [] } = useQuery<VolumeTier[]>({
    queryKey: ["/api/tiers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/deals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/flagged"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/deals/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/flagged"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/deals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/deals/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/flagged"] });
    },
  });

  const openDialog = (deal?: Deal) => {
    if (deal) {
      setEditing(deal);
      setFormData({
        name: deal.name || "",
        country: deal.country || "",
        flag: deal.flag || "",
        volume: deal.volume || "",
        level: deal.level ?? 1,
        score: deal.score ?? 0,
        status: deal.status || "pending",
        type: deal.type || "corporate",
        volumeTierId: deal.volumeTierId ? String(deal.volumeTierId) : "",
        discountType: deal.discountType || "percentage",
        discountValue: deal.discountValue ?? 0,
        notes: deal.notes || "",
      });
    } else {
      setEditing(null);
      setFormData({
        name: "",
        country: "",
        flag: "",
        volume: "",
        level: 1,
        score: 0,
        status: "pending",
        type: "corporate",
        volumeTierId: "",
        discountType: "percentage",
        discountValue: 0,
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      level: Number(formData.level) || 1,
      score: Number(formData.score) || 0,
      volumeTierId: formData.volumeTierId ? Number(formData.volumeTierId) : null,
      discountValue: Number(formData.discountValue) || 0,
    };
    if (editing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const flaggedCount = deals.filter((d) => d.cascadeFlagged).length;

  return (
    <div>
      <PageHeader title="corporate deals" icon={FileText} breadcrumb="commercial">
        <div className="flex items-center gap-2">
          {flaggedCount > 0 && (
            <Badge variant="destructive" className="lowercase text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {flaggedCount} flagged
            </Badge>
          )}
          <Button size="sm" className="lowercase" onClick={() => openDialog()} data-testid="button-add-deal">
            <Plus className="h-4 w-4 mr-1" /> add deal
          </Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12 lowercase">no deals configured</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {deals.map((deal) => {
            const linkedTier = tiers.find((t) => t.id === deal.volumeTierId);
            return (
              <Card
                key={deal.id}
                className={`border ${deal.cascadeFlagged ? "border-amber-500/50 bg-amber-50/30 dark:bg-amber-500/5" : "border-border"}`}
                data-testid={`card-deal-${deal.id}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {deal.cascadeFlagged && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <h3 className="text-sm font-semibold lowercase">{deal.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground lowercase">
                        {deal.flag} {deal.country}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {deal.cascadeFlagged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-green-600"
                          onClick={() => acknowledgeMutation.mutate(deal.id)}
                          title="acknowledge cascade"
                          data-testid={`button-ack-deal-${deal.id}`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDialog(deal)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("delete?")) deleteMutation.mutate(deal.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="bg-muted/50 rounded p-2.5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground lowercase">effective price</span>
                      <span className="font-bold text-primary">{fmtPrice(deal.effectivePrice)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground lowercase">
                        {deal.discountType === "fixed_override" ? "fixed override" : "discount"}
                      </span>
                      <span className="font-medium">
                        {deal.discountType === "fixed_override"
                          ? fmtPrice(deal.discountValue)
                          : `${deal.discountValue ?? 0}%`}
                      </span>
                    </div>
                    {linkedTier && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground lowercase">linked tier</span>
                        <span className="font-medium lowercase">{linkedTier.name} ({fmtPrice(linkedTier.priceNumeric)})</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground lowercase">volume</span>
                      <p className="font-medium">{deal.volume || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground lowercase">score</span>
                      <span className="font-medium">{deal.score}%</span>
                    </div>
                    <Progress value={deal.score ?? 0} className="h-2" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <StatusBadge status={deal.status} />
                    <StatusBadge status={deal.type ?? "corporate"} />
                    {deal.cascadeFlagged && (
                      <Badge variant="outline" className="text-[10px] lowercase border-amber-500 text-amber-600">
                        cascade flagged
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ DEAL DIALOG ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold lowercase">
              {editing ? "edit deal" : "add deal"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs lowercase">deal name</Label>
              <Input value={formData.name ?? ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-9 text-sm" required data-testid="input-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs lowercase">country</Label>
                <Input value={formData.country ?? ""} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="h-9 text-sm" data-testid="input-country" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs lowercase">flag</Label>
                <Input value={formData.flag ?? ""} onChange={(e) => setFormData({ ...formData, flag: e.target.value })} className="h-9 text-sm" data-testid="input-flag" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs lowercase">volume</Label>
                <Input value={formData.volume ?? ""} onChange={(e) => setFormData({ ...formData, volume: e.target.value })} placeholder="e.g. 5M GS/yr" className="h-9 text-sm" data-testid="input-volume" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs lowercase">score (0-100)</Label>
                <Input type="number" value={formData.score ?? 0} onChange={(e) => setFormData({ ...formData, score: e.target.value })} className="h-9 text-sm" data-testid="input-score" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs lowercase">status</Label>
                <Select value={formData.status ?? "pending"} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="pending">pending</SelectItem>
                    <SelectItem value="inactive">inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs lowercase">type</Label>
                <Select value={formData.type ?? "corporate"} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporate">corporate</SelectItem>
                    <SelectItem value="retail">retail</SelectItem>
                    <SelectItem value="pilot">pilot</SelectItem>
                    <SelectItem value="premium">premium</SelectItem>
                    <SelectItem value="government">government</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ═══ PRICING SECTION ═══ */}
            <div className="border border-primary/20 rounded p-3 space-y-3 bg-primary/5">
              <p className="text-xs font-semibold text-primary lowercase">deal pricing</p>
              <div className="space-y-1.5">
                <Label className="text-xs lowercase">linked volume tier</Label>
                <Select value={formData.volumeTierId ?? ""} onValueChange={(val) => setFormData({ ...formData, volumeTierId: val })}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-volumeTierId"><SelectValue placeholder="select tier..." /></SelectTrigger>
                  <SelectContent>
                    {tiers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} — {fmtPrice(t.priceNumeric)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs lowercase">discount type</Label>
                  <Select value={formData.discountType ?? "percentage"} onValueChange={(val) => setFormData({ ...formData, discountType: val })}>
                    <SelectTrigger className="h-9 text-sm" data-testid="select-discountType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">% off tier price</SelectItem>
                      <SelectItem value="fixed_override">fixed override price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs lowercase">
                    {formData.discountType === "fixed_override" ? "override price (£)" : "discount (%)"}
                  </Label>
                  <Input
                    type="number"
                    step={formData.discountType === "fixed_override" ? "0.0001" : "1"}
                    value={formData.discountValue ?? 0}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="h-9 text-sm"
                    data-testid="input-discountValue"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs lowercase">notes</Label>
              <Textarea value={formData.notes ?? ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="text-sm min-h-[60px]" data-testid="textarea-notes" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" className="lowercase" onClick={() => setDialogOpen(false)}>cancel</Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending} className="lowercase" data-testid="button-submit">
                {(createMutation.isPending || updateMutation.isPending) ? "saving..." : "save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
