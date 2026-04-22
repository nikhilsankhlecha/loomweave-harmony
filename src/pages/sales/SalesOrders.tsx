import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Truck } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtINR, fmtMetres, generateCode } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function SalesOrders() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const canDispatch = hasRole(["admin", "dispatch"]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_orders").select("*, customers(name)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error; return data ?? [];
    },
  });

  const createDispatch = useMutation({
    mutationFn: async (so: any) => {
      const { data: items } = await supabase.from("sales_order_items").select("*").eq("sales_order_id", so.id);
      if (!items || items.length === 0) throw new Error("No items on order");
      const dn_code = generateCode("DN");
      const { data: dn, error: dErr } = await supabase.from("dispatch_notes").insert({
        dn_code, sales_order_id: so.id, dispatch_by: user!.id, status: "ready_to_pick",
        total_pieces: so.total_pieces, total_metres: so.total_metres,
      }).select().single();
      if (dErr) throw dErr;
      const di = items.map((i: any) => ({
        dispatch_note_id: dn.id, quality_id: i.quality_id, colour_id: i.colour_id, lot_id: i.lot_id,
        l_value_id: i.l_value_id, l_length_metres: i.l_length_metres, pieces: i.ordered_pieces, metres: i.ordered_metres,
      }));
      await supabase.from("dispatch_items").insert(di);
      return dn;
    },
    onSuccess: (dn: any) => { toast.success(`Dispatch ${dn.dn_code} created`); qc.invalidateQueries({ queryKey: ["dispatch"] }); qc.invalidateQueries({ queryKey: ["orders"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Sales Orders" description="Confirmed orders. Hard reservations active. Create dispatch when ready." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={ShoppingCart} title="No sales orders" description="Convert a quote to create one." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono">{o.order_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(o.order_date)}</TableCell>
                    <TableCell>{o.customers?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(o.total_pieces ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(o.total_metres)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(o.total_value)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-right">{canDispatch && o.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => createDispatch.mutate(o)}><Truck className="mr-1 h-3 w-3" />Pick & dispatch</Button>}</TableCell>
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