import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, Plus, Palette, Ruler } from "lucide-react";
import { toast } from "sonner";
import { useColoursByQuality, useLValuesByQuality } from "@/hooks/useMasters";
import { useAuth } from "@/contexts/AuthContext";
import { fmtMetres } from "@/lib/format";

export default function QualityDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "inventory"]);

  const { data: quality } = useQuery({
    queryKey: ["quality", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("qualities").select("*").eq("id", id!).maybeSingle();
      if (error) throw error; return data;
    },
  });
  const { data: lvalues = [] } = useLValuesByQuality(id);
  const { data: colours = [] } = useColoursByQuality(id);
  const { data: stockByColour = [] } = useQuery({
    queryKey: ["q-stock", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_available_to_sell").select("*").eq("quality_id", id!);
      if (error) throw error; return data ?? [];
    },
  });

  const [lOpen, setLOpen] = useState(false);
  const [lForm, setLForm] = useState({ l_code: "", length_metres: 1.0, is_default: false, notes: "" });
  const [cOpen, setCOpen] = useState(false);
  const [cForm, setCForm] = useState({ colour_code: "", colour_name: "", colour_family: "", shade_band: "", hex_preview: "#999999", is_active: true });

  const saveL = useMutation({
    mutationFn: async () => {
      if (!lForm.l_code || !lForm.length_metres) throw new Error("L code and length required");
      if (lForm.is_default) {
        await supabase.from("l_values").update({ is_default: false }).eq("quality_id", id!);
      }
      const { error } = await supabase.from("l_values").insert({ ...lForm, quality_id: id! });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("L-value added"); setLOpen(false); setLForm({ l_code: "", length_metres: 1.0, is_default: false, notes: "" }); qc.invalidateQueries({ queryKey: ["lvalues", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveC = useMutation({
    mutationFn: async () => {
      if (!cForm.colour_code || !cForm.colour_name) throw new Error("Colour code and name required");
      const dup = colours.find((c: any) => c.colour_code.toLowerCase() === cForm.colour_code.toLowerCase());
      if (dup) throw new Error("Colour code already exists for this quality");
      const { error } = await supabase.from("colours").insert({ ...cForm, quality_id: id! });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Colour added"); setCOpen(false); setCForm({ colour_code: "", colour_name: "", colour_family: "", shade_band: "", hex_preview: "#999999", is_active: true }); qc.invalidateQueries({ queryKey: ["colours", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!quality) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const stockMap = new Map(stockByColour.map((s: any) => [s.colour_id, s]));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => nav("/app/qualities")}><ChevronLeft className="mr-1 h-4 w-4" />All qualities</Button>
      <PageHeader
        title={`${quality.quality_code} · ${quality.quality_name}`}
        description={`${quality.composition ?? "—"} · ${quality.gsm ?? "—"} GSM · ${quality.width_inches ?? "—"}" wide`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">L-values</div><div className="text-2xl font-bold">{lvalues.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Colours</div><div className="text-2xl font-bold">{colours.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total stock</div><div className="text-2xl font-bold">{fmtMetres(stockByColour.reduce((a: number, b: any) => a + Number(b.total_metres ?? 0), 0))}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Ruler className="h-4 w-4" /> L-values</CardTitle>
          {canWrite && (
            <Dialog open={lOpen} onOpenChange={setLOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" />Add L-value</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New L-value</DialogTitle></DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>L code *</Label><Input placeholder="L-120" value={lForm.l_code} onChange={(e) => setLForm({ ...lForm, l_code: e.target.value })} /></div>
                  <div><Label>Length (metres) *</Label><Input type="number" step="0.01" value={lForm.length_metres} onChange={(e) => setLForm({ ...lForm, length_metres: Number(e.target.value) })} /></div>
                  <div className="col-span-2 rounded-md bg-secondary p-3 text-sm">Preview: <span className="font-semibold">{lForm.l_code || "L-???"} = {lForm.length_metres.toFixed(2)} m/pc</span></div>
                  <div className="flex items-center gap-2"><Switch checked={lForm.is_default} onCheckedChange={(v) => setLForm({ ...lForm, is_default: v })} /><Label>Default for this quality</Label></div>
                </div>
                <DialogFooter><Button onClick={() => saveL.mutate()} disabled={saveL.isPending}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {lvalues.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No L-values yet.</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead className="text-right">Length</TableHead><TableHead>Default</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {lvalues.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono">{l.l_code}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(l.length_metres).toFixed(2)} m</TableCell>
                    <TableCell>{l.is_default && <Badge variant="outline" className="bg-success/10 text-success border-success/30">default</Badge>}</TableCell>
                    <TableCell className="text-muted-foreground">{l.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Colours</CardTitle>
          {canWrite && (
            <Dialog open={cOpen} onOpenChange={setCOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" />Add colour</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New colour</DialogTitle></DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>Colour code *</Label><Input value={cForm.colour_code} onChange={(e) => setCForm({ ...cForm, colour_code: e.target.value })} /></div>
                  <div><Label>Colour name *</Label><Input value={cForm.colour_name} onChange={(e) => setCForm({ ...cForm, colour_name: e.target.value })} /></div>
                  <div><Label>Family</Label><Input value={cForm.colour_family} onChange={(e) => setCForm({ ...cForm, colour_family: e.target.value })} /></div>
                  <div><Label>Shade band</Label><Input value={cForm.shade_band} onChange={(e) => setCForm({ ...cForm, shade_band: e.target.value })} /></div>
                  <div className="col-span-2 flex items-center gap-3"><Label>Hex</Label><input type="color" value={cForm.hex_preview} onChange={(e) => setCForm({ ...cForm, hex_preview: e.target.value })} className="h-9 w-20 cursor-pointer rounded border" /><span className="font-mono text-sm">{cForm.hex_preview}</span></div>
                </div>
                <DialogFooter><Button onClick={() => saveC.mutate()} disabled={saveC.isPending}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {colours.length === 0 ? <div className="col-span-full py-6 text-center text-sm text-muted-foreground">No colours yet.</div> :
            colours.map((c: any) => {
              const s: any = stockMap.get(c.id);
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-md border p-3">
                  <div className="h-10 w-10 rounded border shadow-inner" style={{ background: c.hex_preview ?? "#ccc" }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-mono text-sm font-semibold">{c.colour_code}</span><span className="truncate text-sm">{c.colour_name}</span></div>
                    <div className="text-xs text-muted-foreground">{c.colour_family ?? "—"} · {c.shade_band ?? "—"}</div>
                    <div className="mt-0.5 text-xs">{fmtMetres(s?.available_metres)} avail</div>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}