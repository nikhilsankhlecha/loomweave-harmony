import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSuppliers } from "@/hooks/useMasters";
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
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const empty = { name: "", supplier_type: "weaver", contact_name: "", contact_phone: "", city: "", gstin: "", payment_terms: "", score: 0, is_preferred: false, is_blacklisted: false };

export default function Suppliers() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "inventory"]);
  const { data = [], isLoading } = useSuppliers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Name required");
      if (editing) { const { error } = await supabase.from("suppliers").update(form).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("suppliers").insert(form); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setEditing(null); setForm(empty); qc.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Suppliers" description="Mills, dyers, processors, transporters."
        actions={canWrite && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(empty); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New supplier</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>{editing ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Type</Label><Input value={form.supplier_type} onChange={(e) => setForm({ ...form, supplier_type: e.target.value })} placeholder="weaver / dyer / processor / transporter" /></div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>Contact name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div><Label>Contact phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
                <div><Label>Payment terms</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
                <div><Label>Score (0-100)</Label><Input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} /></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_preferred} onCheckedChange={(v) => setForm({ ...form, is_preferred: v })} /><Label>Preferred</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_blacklisted} onCheckedChange={(v) => setForm({ ...form, is_blacklisted: v })} /><Label>Blacklisted</Label></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={Building2} title="No suppliers yet" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>City</TableHead><TableHead>Contact</TableHead><TableHead className="text-right">Score</TableHead><TableHead>Flags</TableHead>{canWrite && <TableHead></TableHead>}</TableRow></TableHeader>
              <TableBody>
                {data.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.supplier_type ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.city ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.contact_name ?? "—"} {s.contact_phone && `· ${s.contact_phone}`}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.score ?? 0}</TableCell>
                    <TableCell className="space-x-1">{s.is_preferred && <Badge variant="outline" className="bg-success/10 text-success border-success/30">preferred</Badge>}{s.is_blacklisted && <Badge variant="destructive">blacklisted</Badge>}</TableCell>
                    {canWrite && <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(s); setForm({ ...empty, ...s }); setOpen(true); }}>Edit</Button></TableCell>}
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