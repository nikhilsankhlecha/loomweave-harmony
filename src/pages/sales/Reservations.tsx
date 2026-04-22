import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtMetres } from "@/lib/format";

export default function Reservations() {
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

  return (
    <div>
      <PageHeader title="Reservations" description="Soft = quote-driven. Hard = sales-order-driven. Soft reservations expire and auto-release." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={ArrowRightLeft} title="No reservations" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Type</TableHead><TableHead>Quality</TableHead><TableHead>Colour</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead>Quote / SO</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                    <TableCell><Badge variant={r.reservation_type === "hard" ? "default" : "secondary"}>{r.reservation_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.qualities?.quality_code}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border" style={{ background: r.colours?.hex_preview ?? "#ccc" }} />{r.colours?.colour_code}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.pieces).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(r.metres)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.sales_orders?.order_code ?? r.quotes?.quote_code ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.expires_at)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
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