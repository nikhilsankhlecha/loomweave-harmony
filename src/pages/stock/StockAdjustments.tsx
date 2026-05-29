import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, SlidersHorizontal, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMetres } from "@/lib/format";
import { useQualities, useColoursByQuality, useLValuesByQuality, useWarehouses } from "@/hooks/useMasters";
import { useAuth } from "@/contexts/AuthContext";

type Direction = "add" | "remove";
type ColourLine = { colour_id?: string; pieces: number };

export default function StockAdjustments() {
  const { user, hasRole } = useAuth();
  const canWrite = hasRole(["admin", "inventory", "dispatch"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>("add");
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [qualityId, setQualityId] = useState<string | undefined>();
  const [lValueId, setLValueId] = useState<string | undefined>();
  const [lLength, setLLength] = useState<number | undefined>();
  const [colourLines, setColourLines] = useState<ColourLine[]>([{ pieces: 0 }]);
  const [notes, setNotes] = useState("");

  const { data: warehouses = [] } = useWarehouses();
  const { data: qualities = [] } = useQualities(true);
  const { data: colours = [] } = useColoursByQuality(qualityId);
  const { data: lvalues = [] } = useLValuesByQuality(qualityId);

  const totals = useMemo(() => {
    const pieces = colourLines.reduce((s, l) => s + (Number(l.pieces) || 0), 0);
    return { pieces, metres: pieces * (lLength || 0) };
  }, [colourLines, lLength]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["stock-adjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_ledger")
        .select("*, qualities(quality_code), colours(colour_code,hex_preview), warehouses(name), l_values(l_code)")
        .in("entry_type", ["inward_adjustment", "deduct_adjustment"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const reset = () => {
    setDirection("add"); setWarehouseId(undefined); setQualityId(undefined);
    setLValueId(undefined); setLLength(undefined); setColourLines([{ pieces: 0 }]); setNotes("");
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!warehouseId || !qualityId || !lValueId) throw new Error("Pick warehouse, quality and L");
      const valid = colourLines.filter((l) => l.colour_id && Number(l.pieces) > 0);
      if (!valid.length) throw new Error("Add at least one colour with pieces");
      const ids = valid.map((l) => l.colour_id);
      if (new Set(ids).size !== ids.length) throw new Error("Each colour can only appear once");
      const sign = direction === "add" ? 1 : -1;
      const rows = valid.map((l) => ({
        warehouse_id: warehouseId,
        quality_id: qualityId,
        colour_id: l.colour_id!,
        l_value_id: lValueId,
        l_length_metres: lLength!,
        pieces: sign * Number(l.pieces),
        metres: sign * Number(l.pieces) * (lLength || 0),
        entry_type: direction === "add" ? ("inward_adjustment" as const) : ("deduct_adjustment" as const),
        approval_status: "pending" as const,
        proposed_by: user?.id ?? null,
        notes: notes || (direction === "add" ? "Manual stock add" : "Manual stock removal"),
        reference_type: "manual_adjustment",
      }));
      const { error } = await supabase.from("stock_ledger").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adjustments submitted — pending billing approval");
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      setOpen(false); reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Stock Adjustments" description="Manually add or remove stock for a colour at a warehouse. Each adjustment is metre-tracked per colour (pieces × L) and goes to billing approval before committing to the ledger."
        actions={canWrite && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New adjustment</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Manual stock adjustment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant={direction === "add" ? "default" : "outline"} size="sm" onClick={() => setDirection("add")}><ArrowUp className="mr-1 h-4 w-4" />Add stock</Button>
                  <Button variant={direction === "remove" ? "destructive" : "outline"} size="sm" onClick={() => setDirection("remove")}><ArrowDown className="mr-1 h-4 w-4" />Remove stock</Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Warehouse *</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger><SelectValue placeholder="Pick warehouse" /></SelectTrigger>
                      <SelectContent>{warehouses.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quality *</Label>
                    <Select value={qualityId} onValueChange={(v) => { setQualityId(v); setColourLines([{ pieces: 0 }]); setLValueId(undefined); setLLength(undefined); }}>
                      <SelectTrigger><SelectValue placeholder="Pick quality" /></SelectTrigger>
                      <SelectContent>{qualities.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quality_code} · {q.quality_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>L value *</Label>
                    <Select value={lValueId} onValueChange={(v) => { const l = lvalues.find((x: any) => x.id === v); setLValueId(v); setLLength(l ? Number(l.length_metres) : undefined); }} disabled={!qualityId}>
                      <SelectTrigger><SelectValue placeholder="Pick L" /></SelectTrigger>
                      <SelectContent>{lvalues.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.l_code} ({Number(l.length_metres).toFixed(2)} m)</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-md border">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Colours & pieces</Label>
                    <Button variant="outline" size="sm" onClick={() => setColourLines([...colourLines, { pieces: 0 }])} disabled={!qualityId}><Plus className="mr-1 h-3 w-3" />Add colour</Button>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Colour</TableHead><TableHead className="w-28">Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {colourLines.map((line, i) => {
                        const usedIds = colourLines.filter((_, xi) => xi !== i).map((x) => x.colour_id);
                        const lineMetres = (Number(line.pieces) || 0) * (lLength || 0);
                        return (
                          <TableRow key={i}>
                            <TableCell>
                              <Select value={line.colour_id} onValueChange={(v) => setColourLines(colourLines.map((x, xi) => xi === i ? { ...x, colour_id: v } : x))} disabled={!qualityId}>
                                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pick colour" /></SelectTrigger>
                                <SelectContent>
                                  {colours.filter((c: any) => !usedIds.includes(c.id)).map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border" style={{ background: c.hex_preview ?? "#ccc" }} />{c.colour_code} · {c.colour_name}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Input type="number" min={0} value={line.pieces} onChange={(e) => setColourLines(colourLines.map((x, xi) => xi === i ? { ...x, pieces: Math.max(0, Number(e.target.value) || 0) } : x))} /></TableCell>
                            <TableCell className="text-right tabular-nums">{fmtMetres(lineMetres)}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => setColourLines(colourLines.length > 1 ? colourLines.filter((_, xi) => xi !== i) : colourLines)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <Label>Reason / notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Damaged rolls, opening balance, recount…" />
                </div>
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  This will record <span className="font-semibold">{direction === "add" ? "+" : "−"}{totals.pieces} pcs / {totals.metres.toFixed(2)} m</span> across {colourLines.filter((l) => l.colour_id && Number(l.pieces) > 0).length} colour(s), pending billing approval.
                </div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Submitting…" : "Submit for approval"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={SlidersHorizontal} title="No adjustments yet" description="Manual stock corrections will appear here." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Warehouse</TableHead><TableHead>Quality</TableHead><TableHead>Colour</TableHead><TableHead>L</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                    <TableCell>{r.entry_type === "inward_adjustment" ? <span className="text-emerald-600">+ Add</span> : <span className="text-rose-600">− Remove</span>}</TableCell>
                    <TableCell>{r.warehouses?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.qualities?.quality_code}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border" style={{ background: r.colours?.hex_preview ?? "#ccc" }} />{r.colours?.colour_code}</span></TableCell>
                    <TableCell className="font-mono text-xs">{r.l_values?.l_code}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.pieces).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtMetres(r.metres)}</TableCell>
                    <TableCell><StatusBadge status={r.approval_status} /></TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
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