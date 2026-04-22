import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWarehouses } from "@/hooks/useMasters";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { fmtMetres } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

export default function Warehouses() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "inventory"]);
  const { data: list = [], isLoading } = useWarehouses();
  const qc = useQueryClient();

  const { data: stockTotals = [] } = useQuery({
    queryKey: ["wh-stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_stock_position").select("warehouse_id,total_metres");
      if (error) throw error; return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    stockTotals.forEach((r: any) => m.set(r.warehouse_id, (m.get(r.warehouse_id) ?? 0) + Number(r.total_metres ?? 0)));
    return m;
  }, [stockTotals]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", city: "", address: "", warehouse_type: "main", is_active: true });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Name required");
      if (editing) { const { error } = await supabase.from("warehouses").update(form).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("warehouses").insert(form); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setEditing(null); setForm({ name: "", city: "", address: "", warehouse_type: "main", is_active: true }); qc.invalidateQueries({ queryKey: ["warehouses"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Warehouses" description="Godowns and storage locations."
        actions={canWrite && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm({ name: "", city: "", address: "", warehouse_type: "main", is_active: true }); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New warehouse</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit warehouse" : "New warehouse"}</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div><Label>Type</Label><Input value={form.warehouse_type} onChange={(e) => setForm({ ...form, warehouse_type: e.target.value })} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            list.length === 0 ? <EmptyState icon={Warehouse} title="No warehouses" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>City</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Stock</TableHead><TableHead>Status</TableHead>{canWrite && <TableHead></TableHead>}</TableRow></TableHeader>
              <TableBody>
                {list.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-muted-foreground">{w.city ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{w.warehouse_type ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(totals.get(w.id) ?? 0)}</TableCell>
                    <TableCell>{w.is_active ? "active" : "inactive"}</TableCell>
                    {canWrite && <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(w); setForm({ name: w.name, city: w.city ?? "", address: w.address ?? "", warehouse_type: w.warehouse_type ?? "", is_active: w.is_active }); setOpen(true); }}>Edit</Button></TableCell>}
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