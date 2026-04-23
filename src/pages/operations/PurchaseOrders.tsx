import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Lightbulb } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { fmtDate, fmtINR, fmtMetres } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export default function PurchaseOrders() {
  const { data: pos = [], isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders")
        .select("*, suppliers(name)")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error; return data ?? [];
    },
  });

  // Auto-suggest: qualities where on-hand < safety stock
  const { data: suggestions = [] } = useQuery({
    queryKey: ["po-suggestions"],
    queryFn: async () => {
      const [{ data: qualities }, { data: ats }] = await Promise.all([
        supabase.from("qualities").select("id, quality_code, quality_name, reorder_point, safety_stock, max_stock").eq("is_active", true),
        supabase.from("v_available_to_sell").select("quality_id, available_metres"),
      ]);
      const onHand = new Map<string, number>();
      (ats ?? []).forEach((a: any) => {
        onHand.set(a.quality_id, (onHand.get(a.quality_id) ?? 0) + Number(a.available_metres ?? 0));
      });
      return (qualities ?? []).map((q: any) => {
        const have = onHand.get(q.id) ?? 0;
        const safety = Number(q.safety_stock ?? 0);
        const max = Number(q.max_stock ?? safety * 2);
        const gap = +(Math.max(0, max - have)).toFixed(2);
        return { ...q, have, gap, urgent: have < safety };
      }).filter((q: any) => q.gap > 0).sort((a: any, b: any) => Number(b.urgent) - Number(a.urgent) || b.gap - a.gap).slice(0, 10);
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Purchase Orders" description="Auto-suggested purchase planning based on safety stock and current availability." />

      <Card>
        <CardContent className="p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" />Auto-suggestions
          </div>
          {suggestions.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">All qualities above safety stock. Nothing to plan.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Quality</TableHead><TableHead className="text-right">On hand</TableHead><TableHead className="text-right">Safety</TableHead><TableHead className="text-right">Suggested PO</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {suggestions.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell><span className="font-mono">{s.quality_code}</span> · <span className="text-xs text-muted-foreground">{s.quality_name}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(s.have)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtMetres(s.safety_stock)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtMetres(s.gap)}</TableCell>
                    <TableCell className="text-right">{s.urgent && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">URGENT</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            pos.length === 0 ? <EmptyState icon={ShoppingCart} title="No purchase orders yet" description="POs raised against suppliers will list here." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>PO</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>Expected</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {pos.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.po_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(p.po_date)}</TableCell>
                    <TableCell>{p.suppliers?.name}</TableCell>
                    <TableCell className="text-xs">{fmtDate(p.expected_delivery)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(p.total_pieces ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(p.total_metres)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(p.total_value)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}