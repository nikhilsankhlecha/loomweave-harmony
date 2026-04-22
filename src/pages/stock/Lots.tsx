import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Layers } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtMetres, fmtNum } from "@/lib/format";

export default function Lots() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["lots-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("*, qualities(quality_code), colours(colour_code,colour_name,hex_preview), warehouses(name), suppliers(name), l_values(l_code)")
        .order("lot_date", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const filtered = data.filter((r: any) =>
    !search || `${r.lot_code} ${r.qualities?.quality_code} ${r.colours?.colour_code} ${r.suppliers?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Lots & Rolls" description="Each inward batch becomes a lot. Roll-level detail captured at GRN/QC." />
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b p-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="max-w-sm" placeholder="Lot, quality, colour, supplier…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} lots</span>
          </div>
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            filtered.length === 0 ? <EmptyState icon={Layers} title="No lots" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Lot</TableHead><TableHead>Date</TableHead><TableHead>Quality</TableHead><TableHead>Colour</TableHead><TableHead>L</TableHead><TableHead>Supplier</TableHead><TableHead>Warehouse</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Available m</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.lot_code}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{fmtDate(r.lot_date)}</TableCell>
                    <TableCell>{r.qualities?.quality_code}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border" style={{ background: r.colours?.hex_preview ?? "#ccc" }} />{r.colours?.colour_code}</span></TableCell>
                    <TableCell className="font-mono text-xs">{r.l_values?.l_code}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.suppliers?.name ?? "—"}</TableCell>
                    <TableCell>{r.warehouses?.name}</TableCell>
                    <TableCell><StatusBadge status={r.lot_status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(r.available_pieces, 0)} / {fmtNum(r.total_pieces, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtMetres(r.available_metres)}</TableCell>
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