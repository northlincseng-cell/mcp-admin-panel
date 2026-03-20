import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Check, X } from "lucide-react";
import type { Approval } from "@shared/schema";

export default function Approvals() {
  const { data: approvals = [], isLoading } = useQuery<Approval[]>({
    queryKey: ["/api/approvals"],
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      apiRequest("PUT", `/api/approvals/${id}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/changelog"] });
    },
  });

  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  return (
    <div>
      <PageHeader title="approval queue" icon={CheckCircle} breadcrumb="audit" />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {pending.length === 0 && resolved.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12 lowercase">
              no approval requests
            </p>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <>
              <h2 className="text-sm font-semibold lowercase mb-3">pending</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {pending.map((item) => (
                  <Card key={item.id} className="border border-border" data-testid={`card-approval-${item.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold lowercase">{item.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={item.type ?? ""} />
                            <StatusBadge status={item.priority ?? "normal"} />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground lowercase">{item.detail}</p>
                      <div className="text-xs text-muted-foreground lowercase">
                        submitted by: {item.submittedBy || "unknown"}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="lowercase flex-1"
                          onClick={() => actionMutation.mutate({ id: item.id, action: "approve" })}
                          disabled={actionMutation.isPending}
                          data-testid={`button-approve-${item.id}`}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="lowercase flex-1 text-destructive"
                          onClick={() => actionMutation.mutate({ id: item.id, action: "reject" })}
                          disabled={actionMutation.isPending}
                          data-testid={`button-reject-${item.id}`}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <>
              <h2 className="text-sm font-semibold lowercase mb-3">resolved</h2>
              <div className="grid grid-cols-2 gap-4">
                {resolved.map((item) => (
                  <Card key={item.id} className="border border-border opacity-60" data-testid={`card-resolved-${item.id}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="text-sm font-medium lowercase">{item.title}</h3>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-xs text-muted-foreground lowercase">{item.detail}</p>
                      <div className="text-xs text-muted-foreground lowercase">
                        resolved by: {item.resolvedBy || "—"} · {item.resolvedAt ? new Date(item.resolvedAt).toLocaleString() : "—"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
