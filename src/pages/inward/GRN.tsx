import { useState } from "react";
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
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMetres, generateCode } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useQualities, useColoursByQuality, useLValuesByQuality, useSuppliers, useWarehouses } from "@/hooks/useMasters";
import { useAuth } from "@/contexts/AuthContext";

type Line = { quality_id?: string; colour_id?: string; l_value_id?: string; l_length_metres?: number; pieces: number; rolls: number };
const blank: Line = { pieces: 0, rolls: 1 };

function LineRow({ line, onChange, onDelete }: { line: Line; onChange: (l: Line) => void; onDelete: () => void }) {
  const { data: qualities = [] } = useQualities(true);
  const { data: colours = [] } = useColoursByQuality(line.quality_id);
  const { data: lvalues = [] } = useLValuesByQuality(line.quality_id);
  const metres = (line.pieces || 0) * (line.l_length_metres || 0);
  return (
    <TableRow>
      <TableCell><Select value={line.quality_id} onValueChange={(v) => onChange({ ...line, quality_id: v, colour_id: undefined, l_value_id: undefined, l_length_metres: undefined })}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Quality" /></SelectTrigger><SelectContent>{qualities.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quality_code}</SelectItem>)}</SelectContent></Select></TableCell>
      <TableCell><Select value={line.colour_id} onValueChange={(v) => onChange({ ...line, colour_id: v })} disabled={!line.quality_id}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Colour" /></SelectTrigger><SelectContent>{colours.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.colour_code}</SelectItem>)}</SelectContent></Select></TableCell>
      <TableCell><Select value={line.l_value_id} onValueChange={(v) => { const l = lvalues.find((x: any) => x.id === v); onChange({ ...line, l_value_id: v, l_length_metres: l ? Number(l.length_metres) : undefined }); }} disabled={!line.quality_id}><SelectTrigger className="w-[110px]"><SelectValue placeholder="L" /></SelectTrigger><SelectContent>{lvalues.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.l_code}</SelectItem>)}</SelectContent></Select></TableCell>
      <TableCell><Input type="number" className="w-20" value={line.pieces} onChange={(e) => onChange({ ...line, pieces: Number(e.target.value) || 0 })} /></TableCell>
      <TableCell><Input type="number" className="w-16" value={line.rolls} onChange={(e) => onChange({ ...line, rolls: Math.max(1, Number(e.target.value) || 1) })} /></TableCell>
      <TableCell className="text-right tabular-nums">{fmtMetres(metres)}</TableCell>
      <TableCell><Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></TableCell>
    </TableRow>
  );
}

export default function GRN() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [challan, setChallan] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...blank }]);

  const { data: suppliers = [] } = useSuppliers();
  const { data: warehouses = [] } = useWarehouses();

  const { data = [], isLoading } = useQuery({
    queryKey: ["grn"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grn_entries")
        .select("*, suppliers(name), warehouses(name)")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error; return data ?? [];
    },
  });

  const totals = lines.reduce((a, l) => ({
    pieces: a.pieces + (l.pieces || 0),
    metres: a.metres + (l.pieces || 0) * (l.l_length_metres || 0),
    rolls: a.rolls + (l.rolls || 0),
  }), { pieces: 0, metres: 0, rolls: 0 });

  const createGrn = useMutation({
    mutationFn: async () => {
      if (!warehouseId) throw new Error("Pick a warehouse");
      const valid = lines.filter((l) => l.quality_id && l.colour_id && l.l_value_id && l.pieces > 0);
      if (!valid.length) throw new Error("Add at least one valid line");
      const grn_code = generateCode("GRN");
      const { data: grn, error: gErr } = await supabase.from("grn_entries").insert({
        grn_code, supplier_id: supplierId ?? null, warehouse_id: warehouseId, challan_number: challan || null,
        vehicle_number: vehicle || null, received_by: user!.id, status: "qc_pending",
        total_pieces: totals.pieces, total_metres: totals.metres,
      }).select().single();
      if (gErr) throw gErr;

      // Create lots (pending_qc) + rolls (pending) per line
      for (const l of valid) {
        const lot_code = generateCode("LOT");
        const metres = (l.pieces || 0) * (l.l_length_metres || 0);
        const { data: lot, error: lErr } = await supabase.from("lots").insert({
          lot_code, quality_id: l.quality_id!, colour_id: l.colour_id!, l_value_id: l.l_value_id!, l_length_metres: l.l_length_metres!,
          supplier_id: supplierId ?? null, warehouse_id: warehouseId, grn_id: grn.id,
          total_pieces: l.pieces, total_metres: metres, available_pieces: 0, available_metres: 0,
          lot_status: "pending_qc",
        }).select().single();
        if (lErr) throw lErr;
        const rolls = Array.from({ length: l.rolls }, (_, i) => ({
          lot_id: lot.id,
          roll_number: `${lot_code}-R${String(i + 1).padStart(2, "0")}`,
          metres: +(metres / l.rolls).toFixed(2),
          qc_status: "pending" as const, status: "pending_qc",
        }));
        await supabase.from("rolls").insert(rolls);
      }
      return grn;
    },
    onSuccess: (grn: any) => { toast.success(`GRN ${grn.grn_code} created — pending QC`); qc.invalidateQueries({ queryKey: ["grn"] }); qc.invalidateQueries({ queryKey: ["qc-rolls"] }); setOpen(false); setLines([{ ...blank }]); setChallan(""); setVehicle(""); setSupplierId(undefined); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="GRN / Inward" description="Goods Receipt Notes with roll-level capture. Lots stay in pending_qc until QC promotes them."
        actions={(
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New GRN</Button></DialogTrigger>
            <DialogContent className="max-w-5xl">
              <DialogHeader><DialogTitle>Receive goods</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div><Label>Supplier</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Pick supplier" /></SelectTrigger><SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div><Label>Warehouse *</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}><SelectTrigger><SelectValue placeholder="Pick warehouse" /></SelectTrigger><SelectContent>{warehouses.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div><Label>Challan #</Label><Input value={challan} onChange={(e) => setChallan(e.target.value)} /></div>
                  <div><Label>Vehicle #</Label><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} /></div>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Quality</TableHead><TableHead>Colour</TableHead><TableHead>L</TableHead><TableHead>Pieces</TableHead><TableHead>Rolls</TableHead><TableHead className="text-right">Metres</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {lines.map((l, i) => <LineRow key={i} line={l} onChange={(nl) => setLines(lines.map((x, xi) => xi === i ? nl : x))} onDelete={() => setLines(lines.filter((_, xi) => xi !== i))} />)}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setLines([...lines, { ...blank }])}><Plus className="mr-1 h-3 w-3" />Add line</Button>
                  <div className="text-sm text-muted-foreground">{totals.rolls} rolls · {totals.pieces.toLocaleString("en-IN")} pcs · <span className="font-semibold text-foreground">{fmtMetres(totals.metres)}</span></div>
                </div>
              </div>
              <DialogFooter><Button onClick={() => createGrn.mutate()} disabled={createGrn.isPending}>{createGrn.isPending ? "Saving…" : "Receive & send to QC"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )} />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={Package} title="No GRNs yet" description="Receive goods from a supplier to start a GRN." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>GRN</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>Warehouse</TableHead><TableHead>Challan</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((g: any) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono">{g.grn_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(g.grn_date)}</TableCell>
                    <TableCell>{g.suppliers?.name ?? "—"}</TableCell>
                    <TableCell>{g.warehouses?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{g.challan_number ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(g.total_pieces ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(g.total_metres)}</TableCell>
                    <TableCell><StatusBadge status={g.status === "qc_pending" ? "pending_qc" : g.status} /></TableCell>
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