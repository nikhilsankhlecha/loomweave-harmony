import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, ScrollText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { fmtMetres, fmtNum } from "@/lib/format";
import { useQualities, useWarehouses } from "@/hooks/useMasters";

export default function StockRegister() {
  const { data: qualities = [] } = useQualities(false);
  const { data: warehouses = [] } = useWarehouses();
  const [search, setSearch] = useState("");
  const [qid, setQid] = useState<string>("all");
  const [wid, setWid] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["stock-register"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("id, lot_code, total_metres, available_metres, total_pieces, available_pieces, lot_status, lot_date, l_length_metres, quality_id, colour_id, warehouse_id, qualities(quality_code,quality_name), colours(colour_code,colour_name,hex_preview), warehouses(name), l_values(l_code)")
        .order("lot_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => data.filter((r: any) => {
      if (qid !== "all" && r.quality_id !== qid) return false;
      if (wid !== "all" && r.warehouse_id !== wid) return false;
      if (search && !`${r.lot_code} ${r.qualities?.quality_code} ${r.colours?.colour_code} ${r.colours?.colour_name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [data, search, qid, wid]
  );

  const totals = filtered.reduce((a: any, r: any) => ({
    metres: a.metres + Number(r.total_metres ?? 0),
    avail: a.avail + Number(r.available_metres ?? 0),
    pieces: a.pieces + Number(r.total_pieces ?? 0),
  }), { metres: 0, avail: 0, pieces: 0 });

  const exportCsv = () => {
    const rows = [["Lot", "Quality", "Colour", "L", "Warehouse", "Date", "Status", "Pieces", "Total m", "Available m"]];
    filtered.forEach((r: any) => rows.push([
      r.lot_code, r.qualities?.quality_code, r.colours?.colour_code, r.l_values?.l_code, r.warehouses?.name,
      r.lot_date, r.lot_status, String(r.total_pieces), String(r.total_metres), String(r.available_metres),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `stock-register-${Date.now()}.csv`; a.click();
  };

  return (
    <div>
      <PageHeader title="Stock Register" description="Lot-level stock across qualities, colours and warehouses."
        actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />CSV</Button>} />
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="flex flex-1 items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input className="max-w-sm" placeholder="Lot, quality, colour…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select value={qid} onValueChange={setQid}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All qualities</SelectItem>{qualities.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quality_code}</SelectItem>)}</SelectContent></Select>
            <Select value={wid} onValueChange={setWid}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All warehouses</SelectItem>{warehouses.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} lots</span>
          </div>
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            filtered.length === 0 ? <EmptyState icon={ScrollText} title="No lots match" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Lot</TableHead><TableHead>Quality</TableHead><TableHead>Colour</TableHead><TableHead>L</TableHead><TableHead>Warehouse</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Total m</TableHead><TableHead className="text-right">Available m</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.lot_code}</TableCell>
                    <TableCell>{r.qualities?.quality_code}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border" style={{ background: r.colours?.hex_preview ?? "#ccc" }} />{r.colours?.colour_code}</span></TableCell>
                    <TableCell className="font-mono text-xs">{r.l_values?.l_code}</TableCell>
                    <TableCell>{r.warehouses?.name}</TableCell>
                    <TableCell className="text-xs uppercase tracking-wide">{r.lot_status}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(r.total_pieces, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(r.total_metres)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtMetres(r.available_metres)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter><TableRow><TableCell colSpan={6} className="text-right">Totals</TableCell><TableCell className="text-right tabular-nums">{fmtNum(totals.pieces, 0)}</TableCell><TableCell className="text-right tabular-nums">{fmtMetres(totals.metres)}</TableCell><TableCell className="text-right tabular-nums">{fmtMetres(totals.avail)}</TableCell></TableRow></TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}