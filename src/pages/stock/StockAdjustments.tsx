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
import { Plus, SlidersHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMetres } from "@/lib/format";
import { useQualities, useColoursByQuality, useLValuesByQuality, useWarehouses } from "@/hooks/useMasters";
import { useAuth } from "@/contexts/AuthContext";

type Direction = "add" | "remove";

export default function StockAdjustments() {
  const { user, hasRole } = useAuth();
  const canWrite = hasRole(["admin", "inventory", "dispatch"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>("add");
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [qualityId, setQualityId] = useState<string | undefined>();
  const [colourId, setColourId] = useState<string | undefined>();
  const [lValueId, setLValueId] = useState<string | undefined>();
  const [lLength, setLLength] = useState<number | undefined>();
  const [pieces, setPieces] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const { data: warehouses = [] } = useWarehouses();
  const { data: qualities = [] } = useQualities(true);
  const { data: colours = [] } = useColoursByQuality(qualityId);
  const { data: lvalues = [] } = useLValuesByQuality(qualityId);

  const metres = useMemo(() => (pieces || 0) * (lLength || 0), [pieces, lLength]);

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
    setDirection("add"); setWarehouseId(undefined); setQualityId(undefined); setColourId(undefined);
    setLValueId(undefined); setLLength(undefined); setPieces(0); setNotes("");
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!warehouseId || !qualityId || !colourId || !lValueId) throw new Error("Pick warehouse, quality, colour and L");
      if (!pieces || pieces <= 0) throw new Error("Pieces must be greater than zero");
      const sign = direction === "add" ? 1 : -1;
      const { error } = await supabase.from("stock_ledger").insert({
        warehouse_id: warehouseId,
        quality_id: qualityId,
        colour_id: colourId,
        l_value_id: lValueId,
        l_length_metres: lLength!,
        pieces: sign * pieces,
        metres: sign * metres,
        entry_type: direction === "add" ? "inward_adjustment" : "deduct_adjustment",
        approval_status: "pending",
        proposed_by: user?.id ?? null,
        notes: notes || (direction === "add" ? "Manual stock add" : "Manual stock removal"),
        reference_type: "manual_adjustment",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adjustment submitted — pending billing approval");
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
                    <Select value={qualityId} onValueChange={(v) => { setQualityId(v); setColourId(undefined); setLValueId(undefined); setLLength(undefined); }}>
                      <SelectTrigger><SelectValue placeholder="Pick quality" /></SelectTrigger>
                      <SelectContent>{qualities.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quality_code} · {q.quality_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Colour *</Label>
                    <Select value={colourId} onValueChange={setColourId} disabled={!qualityId}>
                      <SelectTrigger><SelectValue placeholder="Pick colour" /></SelectTrigger>
                      <SelectContent>
                        {colours.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm border" style={{ background: c.hex_preview ?? "#ccc" }} />{c.colour_code} · {c.colour_name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>L value *</Label>
                    <Select value={lValueId} onValueChange={(v) => { const l = lvalues.find((x: any) => x.id === v); setLValueId(v); setLLength(l ? Number(l.length_metres) : undefined); }} disabled={!qualityId}>
                      <SelectTrigger><SelectValue placeholder="Pick L" /></SelectTrigger>
                      <SelectContent>{lvalues.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.l_code} ({Number(l.length_metres).toFixed(2)} m)</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Pieces *</Label>
                    <Input type="number" min={0} value={pieces} onChange={(e) => setPieces(Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                  <div>
                    <Label>Metres (auto)</Label>
                    <Input value={metres.toFixed(2)} readOnly className="bg-muted" />
                  </div>
                </div>
                <div>
                  <Label>Reason / notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Damaged rolls, opening balance, recount…" />
                </div>
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  This will record <span className="font-semibold">{direction === "add" ? "+" : "−"}{pieces || 0} pcs / {metres.toFixed(2)} m</span> against the selected colour & warehouse, pending billing approval.
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