import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, ArrowUp, ArrowDown } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { fmtDate, fmtMetres } from "@/lib/format";

type Row = any;
type Group = {
  key: string;
  created_at: string;
  entry_type: string;
  warehouse_name?: string;
  quality_code?: string;
  l_code?: string;
  l_length_metres: number;
  proposer?: string;
  notes?: string;
  lines: Row[];
  totalPieces: number;
  totalMetres: number;
};

export default function PendingAdjustments() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["pending-adjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_ledger")
        .select("*, qualities(quality_code), colours(colour_code,colour_name,hex_preview), warehouses(name), l_values(l_code), profiles!stock_ledger_proposed_by_fkey(name)")
        .in("entry_type", ["inward_adjustment", "deduct_adjustment"])
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    data.forEach((r: Row) => {
      // bucket by second-precision created_at + proposer + scope
      const bucket = new Date(r.created_at);
      bucket.setMilliseconds(0);
      const key = [
        bucket.toISOString(), r.proposed_by ?? "", r.entry_type,
        r.warehouse_id, r.quality_id, r.l_value_id, r.notes ?? "",
      ].join("|");
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          created_at: r.created_at,
          entry_type: r.entry_type,
          warehouse_name: r.warehouses?.name,
          quality_code: r.qualities?.quality_code,
          l_code: r.l_values?.l_code,
          l_length_metres: Number(r.l_length_metres ?? 0),
          proposer: r.profiles?.name,
          notes: r.notes,
          lines: [],
          totalPieces: 0,
          totalMetres: 0,
        };
        map.set(key, g);
      }
      g.lines.push(r);
      g.totalPieces += Number(r.pieces ?? 0);
      g.totalMetres += Number(r.metres ?? 0);
    });
    return Array.from(map.values());
  }, [data]);

  const totalPieces = groups.reduce((s, g) => s + g.totalPieces, 0);
  const totalMetres = groups.reduce((s, g) => s + g.totalMetres, 0);

  return (
    <div>
      <PageHeader
        title="Pending Stock Adjustments"
        description="Manual stock adjustments awaiting billing approval. Grouped per submission so you can see per-colour pieces and metres before the ledger commits."
      />
      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : groups.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState icon={Clock} title="No pending adjustments" description="Submitted stock adjustments will appear here until billing approves them." /></CardContent></Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-6 p-4 text-sm">
              <div><span className="text-muted-foreground">Submissions: </span><span className="font-semibold tabular-nums">{groups.length}</span></div>
              <div><span className="text-muted-foreground">Colour lines: </span><span className="font-semibold tabular-nums">{data.length}</span></div>
              <div><span className="text-muted-foreground">Net pieces: </span><span className={`font-semibold tabular-nums ${totalPieces >= 0 ? "text-success" : "text-destructive"}`}>{totalPieces > 0 ? "+" : ""}{Math.round(totalPieces).toLocaleString("en-IN")}</span></div>
              <div><span className="text-muted-foreground">Net metres: </span><span className={`font-semibold tabular-nums ${totalMetres >= 0 ? "text-success" : "text-destructive"}`}>{totalMetres > 0 ? "+" : ""}{fmtMetres(totalMetres)}</span></div>
            </CardContent>
          </Card>

          {groups.map((g) => {
            const isAdd = g.entry_type === "inward_adjustment";
            return (
              <Card key={g.key} className="overflow-hidden">
                <CardHeader className="space-y-2 border-b bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={isAdd ? "default" : "destructive"} className="uppercase tracking-wide">
                      {isAdd ? <><ArrowUp className="mr-1 h-3 w-3" />Add</> : <><ArrowDown className="mr-1 h-3 w-3" />Remove</>}
                    </Badge>
                    <CardTitle className="text-sm font-mono">{g.quality_code} · {g.l_code} ({g.l_length_metres.toFixed(2)} m)</CardTitle>
                    <Badge variant="outline" className="text-xs">{g.warehouse_name ?? "—"}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">{fmtDate(g.created_at)}{g.proposer ? ` · by ${g.proposer}` : ""}</span>
                  </div>
                  {g.notes && <div className="text-xs text-muted-foreground">{g.notes}</div>}
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colour</TableHead>
                        <TableHead className="text-right">Pieces</TableHead>
                        <TableHead className="text-right">Metres</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              <span className="h-3 w-3 rounded-sm border" style={{ background: l.colours?.hex_preview ?? "#ccc" }} />
                              <span className="font-mono text-xs">{l.colours?.colour_code}</span>
                              <span className="text-xs text-muted-foreground">{l.colours?.colour_name}</span>
                            </span>
                          </TableCell>
                          <TableCell className={`text-right tabular-nums ${Number(l.pieces) >= 0 ? "text-success" : "text-destructive"}`}>
                            {Number(l.pieces) > 0 ? "+" : ""}{Number(l.pieces).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums font-semibold ${Number(l.metres) >= 0 ? "text-success" : "text-destructive"}`}>
                            {Number(l.metres) > 0 ? "+" : ""}{fmtMetres(l.metres)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell>Total ({g.lines.length} colour{g.lines.length > 1 ? "s" : ""})</TableCell>
                        <TableCell className="text-right tabular-nums">{g.totalPieces > 0 ? "+" : ""}{Math.round(g.totalPieces).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right tabular-nums">{g.totalMetres > 0 ? "+" : ""}{fmtMetres(g.totalMetres)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}