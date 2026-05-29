import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtMetres } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Reservations() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canRelease = hasRole(["admin", "salesman", "billing"]);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data = [], isLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, qualities(quality_code), colours(colour_code,hex_preview), quotes(quote_code), sales_orders(order_code)")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error; return data ?? [];
    },
  });

  const orderOptions = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((r: any) => {
      if (r.sales_order_id && r.sales_orders?.order_code) map.set(r.sales_order_id, r.sales_orders.order_code);
    });
    return Array.from(map.entries());
  }, [data]);

  const filtered = useMemo(() => {
    if (orderFilter === "all") return data;
    if (orderFilter === "none") return data.filter((r: any) => !r.sales_order_id);
    return data.filter((r: any) => r.sales_order_id === orderFilter);
  }, [data, orderFilter]);

  const release = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("reservations")
        .update({ status: "released" }).in("id", ids).eq("status", "active");
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      toast.success(`Released ${ids.length} reservation${ids.length > 1 ? "s" : ""}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const activeVisible = filtered.filter((r: any) => r.status === "active");
  const allSelected = activeVisible.length > 0 && activeVisible.every((r: any) => selected.has(r.id));

  return (
    <div>
      <PageHeader title="Reservations" description="Soft = quote-driven. Hard = sales-order-driven. Soft reservations expire and auto-release." />
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <Select value={orderFilter} onValueChange={(v) => { setOrderFilter(v); setSelected(new Set()); }}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Filter by sales order" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reservations</SelectItem>
                <SelectItem value="none">No sales order (quote-only)</SelectItem>
                {orderOptions.map(([id, code]) => <SelectItem key={id} value={id}>{code}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{filtered.length} shown · {selected.size} selected</span>
            {canRelease && selected.size > 0 && (
              <Button size="sm" variant="destructive" className="ml-auto" onClick={() => release.mutate(Array.from(selected))} disabled={release.isPending}>
                <Trash2 className="mr-1 h-4 w-4" />Release {selected.size}
              </Button>
            )}
          </div>
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            filtered.length === 0 ? <EmptyState icon={ArrowRightLeft} title="No reservations" /> : (
            <Table>
              <TableHeader><TableRow>
                {canRelease && <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={(v) => {
                  if (v) setSelected(new Set(activeVisible.map((r: any) => r.id)));
                  else setSelected(new Set());
                }} /></TableHead>}
                <TableHead>Created</TableHead><TableHead>Type</TableHead><TableHead>Quality</TableHead><TableHead>Colour</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead>Quote / SO</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead>
                {canRelease && <TableHead className="text-right">Action</TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    {canRelease && <TableCell>{r.status === "active" && <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />}</TableCell>}
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                    <TableCell><Badge variant={r.reservation_type === "hard" ? "default" : "secondary"}>{r.reservation_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.qualities?.quality_code}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border" style={{ background: r.colours?.hex_preview ?? "#ccc" }} />{r.colours?.colour_code}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.pieces).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(r.metres)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.sales_orders?.order_code ?? r.quotes?.quote_code ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.expires_at)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    {canRelease && <TableCell className="text-right">
                      {r.status === "active" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => release.mutate([r.id])} disabled={release.isPending}>
                          <Trash2 className="mr-1 h-3 w-3" />Release
                        </Button>
                      )}
                    </TableCell>}
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