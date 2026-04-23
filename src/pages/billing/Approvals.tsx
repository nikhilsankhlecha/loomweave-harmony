import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtMetres } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Approvals() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_ledger")
        .select("*, qualities(quality_code, quality_name), colours(colour_code, colour_name, hex_preview), warehouses(name), profiles!stock_ledger_proposed_by_fkey(name)")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error; return data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from("stock_ledger")
        .update({ approval_status: "approved", approved_by: user!.id })
        .eq("id", row.id);
      if (error) throw error;
      // If part of dispatch, also flip the DN forward when ALL its rows approved
      if (row.reference_type === "dispatch_note" && row.reference_id) {
        const { data: rest } = await supabase.from("stock_ledger").select("id").eq("reference_type","dispatch_note").eq("reference_id", row.reference_id).eq("approval_status","pending");
        if (!rest || rest.length === 0) {
          await supabase.from("dispatch_notes").update({ status: "approved", approved_by: user!.id }).eq("id", row.reference_id);
        }
      }
    },
    onSuccess: () => { toast.success("Approved & committed"); qc.invalidateQueries({ queryKey: ["approvals"] }); qc.invalidateQueries({ queryKey: ["dispatch"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (row: any) => {
      const reason = window.prompt("Rejection reason?") || "Rejected";
      const { error } = await supabase.from("stock_ledger")
        .update({ approval_status: "rejected", approved_by: user!.id, rejection_note: reason })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rejected"); qc.invalidateQueries({ queryKey: ["approvals"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Billing Approvals" description="Review every proposed stock mutation. Approval commits to the immutable ledger." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : data.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Inbox zero" description="No pending stock mutations to approve." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>Quality / Colour</TableHead>
                <TableHead>Warehouse</TableHead><TableHead className="text-right">Pieces</TableHead>
                <TableHead className="text-right">Metres</TableHead><TableHead>Proposer</TableHead>
                <TableHead>Reference</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                    <TableCell><StatusBadge status={r.entry_type} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full border" style={{ background: r.colours?.hex_preview ?? "#ccc" }} />
                        <span className="font-mono text-xs">{r.qualities?.quality_code}/{r.colours?.colour_code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{r.warehouses?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.pieces).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(r.metres)}</TableCell>
                    <TableCell className="text-xs">{r.profiles?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reference_type ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" className="h-7 text-xs" onClick={() => approve.mutate(r)}><CheckCircle2 className="mr-1 h-3 w-3" />Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reject.mutate(r)}><XCircle className="mr-1 h-3 w-3" />Reject</Button>
                      </div>
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