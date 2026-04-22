import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers } from "@/hooks/useMasters";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { fmtINR } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

const empty = { name: "", contact_name: "", contact_phone: "", city: "", state: "", gstin: "", payment_terms: "", credit_limit: 0 };

export default function Customers() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "billing", "salesman"]);
  const { data = [], isLoading } = useCustomers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Name required");
      if (editing) { const { error } = await supabase.from("customers").update(form).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("customers").insert(form); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setEditing(null); setForm(empty); qc.invalidateQueries({ queryKey: ["customers"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Customers" description="Buyers, retailers and brand partners."
        actions={canWrite && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(empty); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New customer</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Contact name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div><Label>Contact phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
                <div><Label>Payment terms</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Credit limit (₹)</Label><Input type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })} /></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={Users} title="No customers yet" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>City</TableHead><TableHead>State</TableHead><TableHead>GSTIN</TableHead><TableHead>Terms</TableHead><TableHead className="text-right">Credit limit</TableHead>{canWrite && <TableHead></TableHead>}</TableRow></TableHeader>
              <TableBody>
                {data.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.contact_name ?? ""} {c.contact_phone && `· ${c.contact_phone}`}</div></TableCell>
                    <TableCell className="text-muted-foreground">{c.city ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.state ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{c.gstin ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.payment_terms ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(c.credit_limit)}</TableCell>
                    {canWrite && <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(c); setForm({ ...empty, ...c }); setOpen(true); }}>Edit</Button></TableCell>}
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