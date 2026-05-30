import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQualities, useAllColoursByQuality } from "@/hooks/useMasters";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Palette, Search, Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const blank = { colour_code: "", colour_name: "", colour_family: "", shade_band: "", hex_preview: "#888888", is_active: true };

export default function Colours() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "inventory"]);
  const qc = useQueryClient();
  const { data: qualities = [] } = useQualities(true);
  const [qid, setQid] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 180);
  const { data: colours = [] } = useAllColoursByQuality(qid);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(blank);

  const filtered = useMemo(
    () => colours.filter((c: any) =>
      (showInactive || c.is_active) &&
      (!debouncedSearch || `${c.colour_code} ${c.colour_name} ${c.colour_family ?? ""}`.toLowerCase().includes(debouncedSearch.toLowerCase()))
    ),
    [colours, debouncedSearch, showInactive]
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!qid) throw new Error("Pick a quality first");
      if (!form.colour_code || !form.colour_name) throw new Error("Code and name required");
      const payload = { ...form, quality_id: qid };
      if (editing) {
        const { error } = await supabase.from("colours").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("colours").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Colour updated" : "Colour added");
      qc.invalidateQueries({ queryKey: ["colours-all", qid] });
      qc.invalidateQueries({ queryKey: ["colours", qid] });
      setOpen(false); setEditing(null); setForm(blank);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await supabase.from("colours").update({ is_active: !c.is_active }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: (_d, c: any) => {
      toast.success(c.is_active ? "Colour deactivated" : "Colour reactivated");
      qc.invalidateQueries({ queryKey: ["colours-all", qid] });
      qc.invalidateQueries({ queryKey: ["colours", qid] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ colour_code: c.colour_code, colour_name: c.colour_name, colour_family: c.colour_family ?? "", shade_band: c.shade_band ?? "", hex_preview: c.hex_preview ?? "#888888", is_active: c.is_active }); setOpen(true); };

  return (
    <div>
      <PageHeader title="Colour Master" description="Add, edit, and deactivate colours per quality. Inactive colours are hidden from pickers but kept for history." />
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <Select value={qid} onValueChange={setQid}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select a quality…" /></SelectTrigger>
              <SelectContent>
                {qualities.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quality_code} · {q.quality_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex flex-1 items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Search colours…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
            <div className="flex items-center gap-2"><Switch checked={showInactive} onCheckedChange={setShowInactive} /><Label className="text-xs">Show inactive</Label></div>
            {canWrite && qid && <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />New colour</Button>}
          </div>
          {!qid ? <EmptyState icon={Palette} title="Pick a quality" description="Colours always live under a quality." /> :
            filtered.length === 0 ? <EmptyState icon={Palette} title="No colours" description="Add a colour to get started." /> : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((c: any) => (
                  <div key={c.id} className={`group flex items-center gap-3 rounded-md border p-3 ${!c.is_active ? "opacity-60" : ""}`}>
                    <div className="h-12 w-12 shrink-0 rounded border shadow-inner" style={{ background: c.hex_preview ?? "#ccc" }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-mono text-sm font-semibold">{c.colour_code}</span>{!c.is_active && <span className="rounded bg-muted px-1 text-[10px] uppercase">inactive</span>}</div>
                      <div className="truncate text-sm">{c.colour_name}</div>
                      <div className="text-xs text-muted-foreground">{c.colour_family ?? "—"} · {c.shade_band ?? "—"}</div>
                    </div>
                    {canWrite && (
                      <div className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleActive.mutate(c)} title={c.is_active ? "Deactivate" : "Reactivate"}><Power className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(blank); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit colour" : "New colour"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={form.colour_code} onChange={(e) => setForm({ ...form, colour_code: e.target.value })} /></div>
              <div><Label>Name *</Label><Input value={form.colour_name} onChange={(e) => setForm({ ...form, colour_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Family</Label><Input value={form.colour_family} onChange={(e) => setForm({ ...form, colour_family: e.target.value })} placeholder="red / blue / earth…" /></div>
              <div><Label>Shade band</Label><Input value={form.shade_band} onChange={(e) => setForm({ ...form, shade_band: e.target.value })} placeholder="light / medium / dark" /></div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div><Label>Hex preview</Label><Input value={form.hex_preview} onChange={(e) => setForm({ ...form, hex_preview: e.target.value })} /></div>
              <input type="color" value={form.hex_preview || "#888888"} onChange={(e) => setForm({ ...form, hex_preview: e.target.value })} className="h-10 w-12 rounded border" />
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}