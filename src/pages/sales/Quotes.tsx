import { memo, useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtINR, fmtMetres, generateCode } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { CustomerPicker } from "@/components/CustomerPicker";
import { useQualities, useColoursByQuality, useLValuesByQuality } from "@/hooks/useMasters";
import { useAuth } from "@/contexts/AuthContext";

type Line = { quality_id?: string; colour_id?: string; l_value_id?: string; l_length_metres?: number; pieces: number; unit_rate: number };
const blankLine: Line = { pieces: 0, unit_rate: 0 };

const LineRow = memo(function LineRow({ line, onChange, onDelete }: { line: Line; onChange: (l: Line) => void; onDelete: () => void }) {
  const { data: qualities = [] } = useQualities(true);
  const { data: colours = [] } = useColoursByQuality(line.quality_id);
  const { data: lvalues = [] } = useLValuesByQuality(line.quality_id);
  const metres = (line.pieces || 0) * (line.l_length_metres || 0);

  return (
    <TableRow>
      <TableCell><Select value={line.quality_id} onValueChange={(v) => onChange({ ...line, quality_id: v, colour_id: undefined, l_value_id: undefined, l_length_metres: undefined })}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Quality" /></SelectTrigger><SelectContent>{qualities.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quality_code}</SelectItem>)}</SelectContent></Select></TableCell>
      <TableCell><Select value={line.colour_id} onValueChange={(v) => onChange({ ...line, colour_id: v })} disabled={!line.quality_id}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Colour" /></SelectTrigger><SelectContent>{colours.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.colour_code}</SelectItem>)}</SelectContent></Select></TableCell>
      <TableCell><Select value={line.l_value_id} onValueChange={(v) => { const l = lvalues.find((x: any) => x.id === v); onChange({ ...line, l_value_id: v, l_length_metres: l ? Number(l.length_metres) : undefined }); }} disabled={!line.quality_id}><SelectTrigger className="w-[120px]"><SelectValue placeholder="L" /></SelectTrigger><SelectContent>{lvalues.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.l_code} ({Number(l.length_metres).toFixed(2)}m)</SelectItem>)}</SelectContent></Select></TableCell>
      <TableCell><Input type="number" className="w-24" value={line.pieces} onChange={(e) => onChange({ ...line, pieces: Number(e.target.value) || 0 })} /></TableCell>
      <TableCell className="text-right tabular-nums">{fmtMetres(metres)}</TableCell>
      <TableCell><Input type="number" className="w-28" value={line.unit_rate} onChange={(e) => onChange({ ...line, unit_rate: Number(e.target.value) || 0 })} /></TableCell>
      <TableCell className="text-right tabular-nums">{fmtINR(metres * (line.unit_rate || 0))}</TableCell>
      <TableCell><Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></TableCell>
    </TableRow>
  );
});

function QuoteLine({ line, idx, setLines }: { line: Line; idx: number; setLines: React.Dispatch<React.SetStateAction<Line[]>> }) {
  const onChange = useCallback((nl: Line) => setLines((prev) => prev.map((x, xi) => (xi === idx ? nl : x))), [idx, setLines]);
  const onDelete = useCallback(() => setLines((prev) => prev.filter((_, xi) => xi !== idx)), [idx, setLines]);
  return <LineRow line={line} onChange={onChange} onDelete={onDelete} />;
}

export default function Quotes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...blankLine }]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*, customers(name)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error; return data ?? [];
    },
  });

  const totals = lines.reduce((a, l) => {
    const m = (l.pieces || 0) * (l.l_length_metres || 0);
    return { pieces: a.pieces + (l.pieces || 0), metres: a.metres + m, value: a.value + m * (l.unit_rate || 0) };
  }, { pieces: 0, metres: 0, value: 0 });

  const createQuote = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Pick a customer");
      const valid = lines.filter((l) => l.quality_id && l.colour_id && l.l_value_id && l.pieces > 0);
      if (valid.length === 0) throw new Error("Add at least one line");
      const code = generateCode("QT");
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

      const { data: quote, error: qErr } = await supabase.from("quotes").insert({
        quote_code: code, customer_id: customerId, salesman_id: user!.id, status: "reservation_active",
        total_pieces: totals.pieces, total_metres: totals.metres, total_value: totals.value, notes, expires_at: expires,
      }).select().single();
      if (qErr) throw qErr;

      const items = valid.map((l) => {
        const m = (l.pieces || 0) * (l.l_length_metres || 0);
        return { quote_id: quote.id, quality_id: l.quality_id!, colour_id: l.colour_id!, l_value_id: l.l_value_id!,
          l_length_metres: l.l_length_metres!, pieces: l.pieces, metres: m, unit_rate: l.unit_rate || 0, line_value: m * (l.unit_rate || 0) };
      });
      const { error: iErr } = await supabase.from("quote_items").insert(items);
      if (iErr) throw iErr;

      const reservations = valid.map((l) => ({ quote_id: quote.id, quality_id: l.quality_id!, colour_id: l.colour_id!,
        l_value_id: l.l_value_id!, pieces: l.pieces, metres: (l.pieces || 0) * (l.l_length_metres || 0),
        reservation_type: "soft" as const, reserved_by: user!.id, expires_at: expires }));
      await supabase.from("reservations").insert(reservations);

      return quote;
    },
    onSuccess: () => { toast.success("Quote created — soft reservation active for 7 days"); qc.invalidateQueries({ queryKey: ["quotes"] }); setOpen(false); setLines([{ ...blankLine }]); setCustomerId(undefined); setNotes(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const convertToSO = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data: quote } = await supabase.from("quotes").select("*, quote_items(*)").eq("id", quoteId).single();
      if (!quote) throw new Error("Quote missing");
      const code = generateCode("SO");
      const { data: so, error: soErr } = await supabase.from("sales_orders").insert({
        order_code: code, customer_id: quote.customer_id!, salesman_id: quote.salesman_id, quote_id: quote.id,
        total_pieces: quote.total_pieces ?? 0, total_metres: quote.total_metres ?? 0, total_value: quote.total_value ?? 0,
        status: "confirmed", notes: quote.notes,
      }).select().single();
      if (soErr) throw soErr;
      const items = (quote.quote_items as any[]).map((i) => ({
        sales_order_id: so.id, quality_id: i.quality_id, colour_id: i.colour_id, l_value_id: i.l_value_id,
        l_length_metres: i.l_length_metres, ordered_pieces: i.pieces, ordered_metres: i.metres, unit_rate: i.unit_rate,
      }));
      await supabase.from("sales_order_items").insert(items);
      await supabase.from("quotes").update({ status: "converted" }).eq("id", quote.id);
      // upgrade reservations soft → hard
      await supabase.from("reservations").update({ reservation_type: "hard", sales_order_id: so.id }).eq("quote_id", quote.id).eq("status", "active");
      return so;
    },
    onSuccess: (so: any) => { toast.success(`Sales order ${so.order_code} created`); qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["orders"] }); nav("/app/orders"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Quotes" description="Salesman quote builder — submit creates a soft reservation, billing converts to SO."
        actions={(
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New quote</Button></DialogTrigger>
            <DialogContent className="max-w-5xl">
              <DialogHeader><DialogTitle>Build quote</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>Customer *</Label><CustomerPicker value={customerId} onChange={setCustomerId} /></div>
                  <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Quality</TableHead><TableHead>Colour</TableHead><TableHead>L</TableHead><TableHead>Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead>Rate /m</TableHead><TableHead className="text-right">Value</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {lines.map((l, i) => (
                        <QuoteLine
                          key={i}
                          line={l}
                          idx={i}
                          setLines={setLines}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setLines([...lines, { ...blankLine }])}><Plus className="mr-1 h-3 w-3" />Add line</Button>
                  <div className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{fmtMetres(totals.metres)}</span> · <span className="font-semibold text-foreground">{fmtINR(totals.value)}</span></div>
                </div>
              </div>
              <DialogFooter><Button onClick={() => createQuote.mutate()} disabled={createQuote.isPending}>{createQuote.isPending ? "Saving…" : "Submit quote (soft reserve)"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={ClipboardList} title="No quotes yet" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Quote</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Pieces</TableHead><TableHead className="text-right">Metres</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((q: any) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono">{q.quote_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(q.created_at)}</TableCell>
                    <TableCell>{q.customers?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(q.total_pieces ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(q.total_metres)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(q.total_value)}</TableCell>
                    <TableCell><StatusBadge status={q.status} /></TableCell>
                    <TableCell className="text-right">{(q.status === "reservation_active" || q.status === "submitted") && <Button size="sm" variant="outline" onClick={() => convertToSO.mutate(q.id)}>Convert to SO</Button>}</TableCell>
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