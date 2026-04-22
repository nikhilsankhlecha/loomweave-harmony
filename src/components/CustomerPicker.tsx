import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers } from "@/hooks/useMasters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function CustomerPicker({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const { data: customers = [] } = useCustomers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_name: "", contact_phone: "", city: "", state: "", gstin: "", payment_terms: "30 days net" });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Name required");
      const { data, error } = await supabase.from("customers").insert(form).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row: any) => { toast.success("Customer added"); qc.invalidateQueries({ queryKey: ["customers"] }); onChange(row.id); setOpen(false); setForm({ name: "", contact_name: "", contact_phone: "", city: "", state: "", gstin: "", payment_terms: "30 days net" }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Select customer…" /></SelectTrigger>
        <SelectContent>
          {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} {c.city && `· ${c.city}`}</SelectItem>)}
        </SelectContent>
      </Select>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button type="button" variant="outline" size="icon"><Plus className="h-4 w-4" /></Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Quick add customer</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Contact</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Save customer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}