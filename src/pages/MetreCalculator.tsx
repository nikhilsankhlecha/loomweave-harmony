import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Copy, FileDown } from "lucide-react";
import { fmtMetres, fmtPieces } from "@/lib/format";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Row = {
  id: string;
  qualityId?: string;
  lValueId?: string;
  lLength?: number;
  items: { id: string; colourId?: string; pieces: number }[];
};

const newId = () => Math.random().toString(36).slice(2, 9);
const newRow = (): Row => ({ id: newId(), items: [{ id: newId(), pieces: 0 }] });

export default function MetreCalculator() {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);

  const qualitiesQ = useQuery({
    queryKey: ["qualities-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qualities").select("id,quality_code,quality_name").eq("is_active", true).order("quality_code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lValuesQ = useQuery({
    queryKey: ["lvalues-all"],
    queryFn: async () => (await supabase.from("l_values").select("id,quality_id,l_code,length_metres,is_default")).data ?? [],
  });

  const coloursQ = useQuery({
    queryKey: ["colours-active"],
    queryFn: async () => (await supabase.from("colours").select("id,quality_id,colour_code,colour_name,hex_preview").eq("is_active", true)).data ?? [],
  });

  const lValuesFor = (qid?: string) => (lValuesQ.data ?? []).filter((l: any) => l.quality_id === qid);
  const coloursFor = (qid?: string) => (coloursQ.data ?? []).filter((c: any) => c.quality_id === qid);

  const onQualityChange = (rowId: string, qid: string) => {
    const ls = (lValuesQ.data ?? []).filter((l: any) => l.quality_id === qid);
    const def = ls.find((l: any) => l.is_default) ?? ls[0];
    setRows((rs) => rs.map((r) => r.id === rowId ? { ...r, qualityId: qid, lValueId: def?.id, lLength: def ? Number(def.length_metres) : undefined, items: r.items.map(i => ({ ...i, colourId: undefined })) } : r));
  };

  const onLChange = (rowId: string, lid: string) => {
    const l: any = (lValuesQ.data ?? []).find((x: any) => x.id === lid);
    setRows((rs) => rs.map((r) => r.id === rowId ? { ...r, lValueId: lid, lLength: l ? Number(l.length_metres) : undefined } : r));
  };

  const totals = useMemo(() => {
    let grand = 0, gp = 0;
    const perRow = rows.map((r) => {
      const m = r.lLength ? r.items.reduce((s, i) => s + (i.pieces || 0) * (r.lLength || 0), 0) : 0;
      const p = r.items.reduce((s, i) => s + (i.pieces || 0), 0);
      grand += m; gp += p;
      return { rowId: r.id, metres: m, pieces: p };
    });
    return { perRow, grandMetres: grand, grandPieces: gp };
  }, [rows]);

  const copyText = () => {
    const lines: string[] = [name ? `Calculation: ${name}` : "Metre Calculation"];
    rows.forEach((r, idx) => {
      const q = qualitiesQ.data?.find((x: any) => x.id === r.qualityId);
      const l = lValuesQ.data?.find((x: any) => x.id === r.lValueId);
      lines.push(`\nRow ${idx + 1}: ${q?.quality_code ?? "—"} @ ${l?.l_code ?? "—"} (${r.lLength ?? 0} m/pc)`);
      r.items.forEach((i) => {
        const c = coloursQ.data?.find((x: any) => x.id === i.colourId);
        const m = (i.pieces || 0) * (r.lLength || 0);
        lines.push(`  ${c?.colour_code ?? "—"}: ${i.pieces} pcs = ${m.toFixed(2)} m`);
      });
      const t = totals.perRow.find((x) => x.rowId === r.id);
      lines.push(`  Row total: ${t?.metres.toFixed(2)} m`);
    });
    lines.push(`\nGRAND TOTAL: ${totals.grandMetres.toFixed(2)} m  (${totals.grandPieces} pcs)`);
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Copied to clipboard");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("LoomLedger — Metre Calculation", 14, 16);
    doc.setFontSize(10); doc.text(name || "Untitled", 14, 22);
    doc.text(new Date().toLocaleString(), 14, 28);
    let y = 36;
    rows.forEach((r, idx) => {
      const q = qualitiesQ.data?.find((x: any) => x.id === r.qualityId);
      const l = lValuesQ.data?.find((x: any) => x.id === r.lValueId);
      const body = r.items.map((i) => {
        const c = coloursQ.data?.find((x: any) => x.id === i.colourId);
        const m = (i.pieces || 0) * (r.lLength || 0);
        return [c?.colour_code ?? "—", c?.colour_name ?? "", String(i.pieces || 0), m.toFixed(2)];
      });
      autoTable(doc, {
        startY: y,
        head: [[`Row ${idx + 1}: ${q?.quality_code ?? "—"} @ ${l?.l_code ?? "—"}`, "Colour", "Pieces", "Metres"]],
        body: body.map(b => ["", ...b]),
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
      doc.text(`Row total: ${(totals.perRow.find(x => x.rowId === r.id)?.metres ?? 0).toFixed(2)} m`, 14, y);
      y += 8;
    });
    doc.setFontSize(12);
    doc.text(`GRAND TOTAL: ${totals.grandMetres.toFixed(2)} m  (${totals.grandPieces} pcs)`, 14, y + 4);
    doc.save(`${(name || "metre-calc").replace(/\s+/g, "_")}.pdf`);
  };

  const saveDraft = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: calc, error } = await supabase.from("metre_calculations").insert({
      calculation_name: name || `Calc ${new Date().toLocaleString()}`,
      created_by: user.id,
      grand_total_metres: totals.grandMetres,
    }).select().single();
    if (error) return toast.error(error.message);
    const items = rows.flatMap((r) =>
      r.items.filter(i => i.colourId && i.pieces > 0).map(i => ({
        calculation_id: calc.id,
        quality_id: r.qualityId,
        colour_id: i.colourId,
        l_value_id: r.lValueId,
        l_length_metres: r.lLength,
        pieces: i.pieces,
        metres: (i.pieces || 0) * (r.lLength || 0),
      })),
    );
    if (items.length) await supabase.from("metre_calculation_items").insert(items);
    toast.success("Draft saved");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Metre Calculator"
        description="Multi-row × multi-colour calculation. Total metres = pieces × (L-value ÷ 100)."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={copyText}><Copy className="mr-1 h-4 w-4" />Copy</Button>
            <Button variant="outline" size="sm" onClick={exportPDF}><FileDown className="mr-1 h-4 w-4" />PDF</Button>
            <Button size="sm" onClick={saveDraft}>Save draft</Button>
          </>
        }
      />

      <Card><CardContent className="p-4">
        <Input placeholder="Calculation name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
      </CardContent></Card>

      {rows.map((r, idx) => {
        const lvs = lValuesFor(r.qualityId);
        const cls = coloursFor(r.qualityId);
        const rt = totals.perRow.find(x => x.rowId === r.id);
        return (
          <Card key={r.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Row {idx + 1}</div>
                <div className="flex-1 min-w-[180px]">
                  <Select value={r.qualityId} onValueChange={(v) => onQualityChange(r.id, v)}>
                    <SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger>
                    <SelectContent>
                      {qualitiesQ.data?.map((q: any) => (
                        <SelectItem key={q.id} value={q.id}>{q.quality_code} — {q.quality_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[140px]">
                  <Select value={r.lValueId} onValueChange={(v) => onLChange(r.id, v)} disabled={!lvs.length}>
                    <SelectTrigger><SelectValue placeholder="L-value" /></SelectTrigger>
                    <SelectContent>
                      {lvs.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.l_code} = {Number(l.length_metres).toFixed(2)} m/pc</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setRows((rs) => rs.filter(x => x.id !== r.id))} disabled={rows.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="space-y-2">
                {r.items.map((it) => {
                  const c = cls.find((x: any) => x.id === it.colourId);
                  const m = (it.pieces || 0) * (r.lLength || 0);
                  return (
                    <div key={it.id} className="flex flex-wrap items-center gap-2">
                      {c?.hex_preview && <span className="h-5 w-5 rounded border" style={{ backgroundColor: c.hex_preview }} />}
                      <div className="min-w-[180px] flex-1">
                        <Select value={it.colourId} onValueChange={(v) => setRows((rs) => rs.map(x => x.id === r.id ? { ...x, items: x.items.map(i => i.id === it.id ? { ...i, colourId: v } : i) } : x))} disabled={!cls.length}>
                          <SelectTrigger><SelectValue placeholder="Select colour" /></SelectTrigger>
                          <SelectContent>
                            {cls.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="inline-flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: c.hex_preview ?? "transparent" }} />
                                  {c.colour_code} — {c.colour_name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number" min={0} className="w-24" placeholder="Pieces"
                        value={it.pieces || ""}
                        onChange={(e) => setRows((rs) => rs.map(x => x.id === r.id ? { ...x, items: x.items.map(i => i.id === it.id ? { ...i, pieces: Number(e.target.value) || 0 } : i) } : x))}
                      />
                      <div className="w-32 text-right font-mono tabular-nums text-sm">{m.toFixed(2)} m</div>
                      <Button variant="ghost" size="icon" onClick={() => setRows((rs) => rs.map(x => x.id === r.id ? { ...x, items: x.items.filter(i => i.id !== it.id) } : x))} disabled={r.items.length === 1}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => setRows((rs) => rs.map(x => x.id === r.id ? { ...x, items: [...x.items, { id: newId(), pieces: 0 }] } : x))}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add colour
                </Button>
              </div>

              <div className="flex items-center justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">Row total</span>
                <span className="font-bold tabular-nums">{fmtMetres(rt?.metres)} · {fmtPieces(rt?.pieces)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button variant="outline" onClick={() => setRows((rs) => [...rs, newRow()])}>
        <Plus className="mr-1 h-4 w-4" /> Add row
      </Button>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Grand total</div>
            <div className="text-3xl font-bold tabular-nums">{fmtMetres(totals.grandMetres)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest opacity-80">Total pieces</div>
            <div className="text-2xl font-bold tabular-nums">{fmtPieces(totals.grandPieces)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}