import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileSpreadsheet } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtMetres, fmtNum } from "@/lib/format";

export default function StockLedger() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_ledger")
        .select("*, qualities(quality_code), colours(colour_code,hex_preview), warehouses(name), lots(lot_code)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => data.filter((r: any) => {
      if (type !== "all" && r.entry_type !== type) return false;
      if (status !== "all" && r.approval_status !== status) return false;
      if (search && !`${r.qualities?.quality_code} ${r.colours?.colour_code} ${r.lots?.lot_code} ${r.entry_type}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [data, search, type, status]
  );

  return (
    <div>
      <PageHeader title="Immutable Stock Ledger" description="Append-only audit log. Once committed, entries cannot be edited or deleted." />
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="flex flex-1 items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input className="max-w-sm" placeholder="Quality, colour, lot…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select value={type} onValueChange={setType}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="inward_grn">Inward GRN</SelectItem>
              <SelectItem value="inward_return">Inward return</SelectItem>
              <SelectItem value="inward_adjustment">Adjustment +</SelectItem>
              <SelectItem value="deduct_dispatch">Deduct dispatch</SelectItem>
              <SelectItem value="deduct_transfer">Transfer</SelectItem>
              <SelectItem value="deduct_jobwork_out">Jobwork out</SelectItem>
              <SelectItem value="reserve">Reserve</SelectItem>
              <SelectItem value="unreserve">Unreserve</SelectItem>
            </SelectContent></Select>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="auto_committed">Auto-committed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent></Select>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} entries</span>
          </div>
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            filtered.length === 0 ? <EmptyState icon={FileSpreadsheet} title="No ledger entries match" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>Quality</TableHead><TableHead>Colour</TableHead><TableHead>Lot</TableHead><TableHead>Warehouse</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-xs uppercase tracking-wide">{r.entry_type.split("_").join(" ")}</TableCell>
                    <TableCell className="font-mono text-xs">{r.qualities?.quality_code}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border" style={{ background: r.colours?.hex_preview ?? "#ccc" }} />{r.colours?.colour_code}</span></TableCell>
                    <TableCell className="font-mono text-xs">{r.lots?.lot_code ?? "—"}</TableCell>
                    <TableCell>{r.warehouses?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(r.pieces, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(r.metres)}</TableCell>
                    <TableCell><StatusBadge status={r.approval_status} /></TableCell>
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