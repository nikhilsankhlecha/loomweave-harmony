import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, ShieldCheck, CheckCircle2, XCircle, PackageCheck } from "lucide-react";
import { fmtDate, fmtMetres } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/EmptyState";

const COLUMNS: { key: string; title: string; tone: string; icon: any }[] = [
  { key: "ready_to_pick", title: "Ready to pick", tone: "bg-secondary text-secondary-foreground", icon: PackageCheck },
  { key: "awaiting_billing_auth", title: "Awaiting billing", tone: "bg-warning/15 text-warning border-warning/30", icon: ShieldCheck },
  { key: "approved", title: "Approved", tone: "bg-accent/15 text-accent border-accent/30", icon: CheckCircle2 },
  { key: "dispatched", title: "Dispatched", tone: "bg-success/15 text-success border-success/30", icon: Truck },
];

export default function DispatchQueue() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const canDispatchOps = hasRole(["dispatch", "admin"]);
  const canBilling = hasRole(["billing", "admin"]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["dispatch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_notes")
        .select("*, sales_orders(order_code, customers(name)), dispatch_items(*, qualities(quality_code), colours(colour_code, hex_preview))")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error; return data ?? [];
    },
  });

  // Submit ready -> awaiting billing AND create proposed deduction ledger rows (pending)
  const submitForApproval = useMutation({
    mutationFn: async (dn: any) => {
      const items = dn.dispatch_items ?? [];
      // pick a warehouse: prefer dn.warehouse_id, else first lot's warehouse, else any active warehouse
      let warehouseId = dn.warehouse_id;
      if (!warehouseId && items.length > 0 && items[0].lot_id) {
        const { data: lot } = await supabase.from("lots").select("warehouse_id").eq("id", items[0].lot_id).maybeSingle();
        warehouseId = lot?.warehouse_id;
      }
      if (!warehouseId) {
        const { data: wh } = await supabase.from("warehouses").select("id").eq("is_active", true).limit(1).maybeSingle();
        warehouseId = wh?.id;
      }
      if (!warehouseId) throw new Error("No warehouse available to allocate");

      const ledgerRows = items.map((it: any) => ({
        entry_type: "deduct_dispatch" as const,
        quality_id: it.quality_id, colour_id: it.colour_id, lot_id: it.lot_id,
        l_value_id: it.l_value_id, l_length_metres: it.l_length_metres,
        pieces: -Math.abs(Number(it.pieces || 0)), metres: -Math.abs(Number(it.metres || 0)),
        warehouse_id: warehouseId,
        approval_status: "pending" as const, is_committed: false,
        proposed_by: user!.id,
        reference_type: "dispatch_note", reference_id: dn.id,
        notes: `Dispatch ${dn.dn_code}`,
      }));
      if (ledgerRows.length) {
        const { error: lErr } = await supabase.from("stock_ledger").insert(ledgerRows);
        if (lErr) throw lErr;
      }
      const { error } = await supabase.from("dispatch_notes")
        .update({ status: "awaiting_billing_auth", warehouse_id: warehouseId })
        .eq("id", dn.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Submitted for billing approval"); qc.invalidateQueries({ queryKey: ["dispatch"] }); qc.invalidateQueries({ queryKey: ["approvals"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Billing approves -> commit ledger rows; mark DN approved
  const approve = useMutation({
    mutationFn: async (dn: any) => {
      const { error: ledErr } = await supabase.from("stock_ledger")
        .update({ approval_status: "approved", approved_by: user!.id })
        .eq("reference_type", "dispatch_note").eq("reference_id", dn.id).eq("approval_status", "pending");
      if (ledErr) throw ledErr;
      const { error } = await supabase.from("dispatch_notes")
        .update({ status: "approved", approved_by: user!.id }).eq("id", dn.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Dispatch approved & ledger committed"); qc.invalidateQueries({ queryKey: ["dispatch"] }); qc.invalidateQueries({ queryKey: ["approvals"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (dn: any) => {
      const reason = window.prompt("Rejection reason?") || "Rejected";
      await supabase.from("stock_ledger")
        .update({ approval_status: "rejected", approved_by: user!.id, rejection_note: reason })
        .eq("reference_type", "dispatch_note").eq("reference_id", dn.id).eq("approval_status", "pending");
      await supabase.from("dispatch_notes")
        .update({ status: "ready_to_pick", rejection_note: reason }).eq("id", dn.id);
    },
    onSuccess: () => { toast.success("Rejected, sent back to pickers"); qc.invalidateQueries({ queryKey: ["dispatch"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const markDispatched = useMutation({
    mutationFn: async (dn: any) => {
      const { error } = await supabase.from("dispatch_notes").update({
        status: "dispatched", dispatch_date: new Date().toISOString().slice(0, 10),
      }).eq("id", dn.id);
      if (error) throw error;
      await supabase.from("sales_orders").update({ status: "dispatched" }).eq("id", dn.sales_order_id);
    },
    onSuccess: () => { toast.success("Marked dispatched"); qc.invalidateQueries({ queryKey: ["dispatch"] }); qc.invalidateQueries({ queryKey: ["orders"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped: Record<string, any[]> = { ready_to_pick: [], awaiting_billing_auth: [], approved: [], dispatched: [] };
  data.forEach((d: any) => { if (grouped[d.status]) grouped[d.status].push(d); });

  return (
    <div>
      <PageHeader title="Dispatch Queue" description="Pick → submit for billing approval → committed ledger → dispatched. Mutations never bypass billing." />
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState icon={Truck} title="No dispatches yet" description="Create one from a Sales Order." /></CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <col.icon className="h-3.5 w-3.5" />{col.title}
                </div>
                <Badge variant="outline">{grouped[col.key].length}</Badge>
              </div>
              <div className="space-y-2">
                {grouped[col.key].length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">Empty</div>
                ) : grouped[col.key].map((dn: any) => (
                  <Card key={dn.id} className="overflow-hidden">
                    <CardHeader className="space-y-1 p-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-mono">{dn.dn_code}</CardTitle>
                        <span className="text-[10px] text-muted-foreground">{fmtDate(dn.created_at)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        SO {dn.sales_orders?.order_code} · {dn.sales_orders?.customers?.name}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 border-t p-3">
                      <div className="space-y-1">
                        {(dn.dispatch_items ?? []).slice(0, 3).map((it: any) => (
                          <div key={it.id} className="flex items-center gap-2 text-xs">
                            <span className="inline-block h-2.5 w-2.5 rounded-full border" style={{ background: it.colours?.hex_preview ?? "#ccc" }} />
                            <span className="font-mono">{it.qualities?.quality_code}/{it.colours?.colour_code}</span>
                            <span className="ml-auto tabular-nums text-muted-foreground">{Number(it.pieces).toLocaleString("en-IN")}p · {fmtMetres(it.metres)}</span>
                          </div>
                        ))}
                        {(dn.dispatch_items ?? []).length > 3 && (
                          <div className="text-[10px] text-muted-foreground">+ {(dn.dispatch_items ?? []).length - 3} more</div>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t pt-2 text-xs">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-semibold tabular-nums">{fmtMetres(dn.total_metres)}</span>
                      </div>
                      {dn.rejection_note && (
                        <div className="rounded bg-destructive/10 px-2 py-1 text-[10px] text-destructive">Rejected: {dn.rejection_note}</div>
                      )}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {dn.status === "ready_to_pick" && canDispatchOps && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => submitForApproval.mutate(dn)} disabled={submitForApproval.isPending}>
                            <ShieldCheck className="mr-1 h-3 w-3" />Submit for billing
                          </Button>
                        )}
                        {dn.status === "awaiting_billing_auth" && canBilling && (
                          <>
                            <Button size="sm" className="h-7 text-xs" onClick={() => approve.mutate(dn)} disabled={approve.isPending}>
                              <CheckCircle2 className="mr-1 h-3 w-3" />Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reject.mutate(dn)}>
                              <XCircle className="mr-1 h-3 w-3" />Reject
                            </Button>
                          </>
                        )}
                        {dn.status === "approved" && canDispatchOps && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => markDispatched.mutate(dn)}>
                            <Truck className="mr-1 h-3 w-3" />Mark dispatched
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}