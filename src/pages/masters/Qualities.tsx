import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQualities } from "@/hooks/useMasters";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Layers, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type Form = {
  quality_code: string; quality_name: string; category?: string; composition?: string;
  weave?: string; gsm?: number | null; width_inches?: number | null;
  reorder_point?: number | null; safety_stock?: number | null; is_active: boolean;
};
const empty: Form = { quality_code: "", quality_name: "", is_active: true };

export default function Qualities() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "inventory"]);
  const { data = [], isLoading } = useQualities(false);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const filtered = useMemo(
    () => data.filter((q: any) =>
      !search || `${q.quality_code} ${q.quality_name} ${q.category ?? ""}`.toLowerCase().includes(search.toLowerCase())
    ),
    [data, search]
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!form.quality_code || !form.quality_name) throw new Error("Code and name required");
      const payload = { ...form, gsm: form.gsm || null, width_inches: form.width_inches || null,
        reorder_point: form.reorder_point || 0, safety_stock: form.safety_stock || 0 };
      if (editing) {
        const { error } = await supabase.from("qualities").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("qualities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Quality updated" : "Quality created");
      qc.invalidateQueries({ queryKey: ["qualities"] });
      setOpen(false); setEditing(null); setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (q: any) => { setEditing(q); setForm(q); setOpen(true); };

  return (
    <div>
      <PageHeader
        title="Quality Master"
        description="Fabric qualities — codes, composition, GSM and reorder rules."
        actions={canWrite && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(empty); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New quality</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>{editing ? "Edit quality" : "New quality"}</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Code *</Label><Input value={form.quality_code} onChange={(e) => setForm({ ...form, quality_code: e.target.value })} /></div>
                <div><Label>Name *</Label><Input value={form.quality_name} onChange={(e) => setForm({ ...form, quality_name: e.target.value })} /></div>
                <div><Label>Category</Label><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div><Label>Composition</Label><Input value={form.composition ?? ""} onChange={(e) => setForm({ ...form, composition: e.target.value })} /></div>
                <div><Label>Weave</Label><Input value={form.weave ?? ""} onChange={(e) => setForm({ ...form, weave: e.target.value })} /></div>
                <div><Label>GSM</Label><Input type="number" value={form.gsm ?? ""} onChange={(e) => setForm({ ...form, gsm: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Width (inches)</Label><Input type="number" value={form.width_inches ?? ""} onChange={(e) => setForm({ ...form, width_inches: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Reorder point (m)</Label><Input type="number" value={form.reorder_point ?? ""} onChange={(e) => setForm({ ...form, reorder_point: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Safety stock (m)</Label><Input type="number" value={form.safety_stock ?? ""} onChange={(e) => setForm({ ...form, safety_stock: e.target.value ? Number(e.target.value) : null })} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b p-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search code, name, category…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {data.length}</span>
          </div>
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            filtered.length === 0 ? <EmptyState icon={Layers} title="No qualities yet" description="Create your first fabric quality." /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead>
                  <TableHead>Composition</TableHead><TableHead className="text-right">GSM</TableHead>
                  <TableHead className="text-right">Width</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q: any) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono font-medium">{q.quality_code}</TableCell>
                    <TableCell>{q.quality_name}</TableCell>
                    <TableCell className="text-muted-foreground">{q.category ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{q.composition ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{q.gsm ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{q.width_inches ?? "—"}"</TableCell>
                    <TableCell>{q.is_active ? <Badge variant="outline" className="bg-success/10 text-success border-success/30">active</Badge> : <Badge variant="secondary">inactive</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild><Link to={`/app/qualities/${q.id}`}>Open</Link></Button>
                      {canWrite && <Button variant="ghost" size="sm" onClick={() => startEdit(q)}>Edit</Button>}
                    </TableCell>
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