import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { fmtDate, fmtMetres } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function QC() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["qc-rolls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rolls")
        .select("*, lots(*, qualities(quality_code), colours(colour_code, hex_preview), warehouses(name))")
        .eq("qc_status", "pending")
        .order("created_at", { ascending: false }).limit(300);
      if (error) throw error; return data ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ roll, status }: { roll: any; status: "passed" | "failed" }) => {
      const { error } = await supabase.from("rolls")
        .update({ qc_status: status, status: status === "passed" ? "available" : "rejected" })
        .eq("id", roll.id);
      if (error) throw error;

      // After update, check if lot has any pending rolls left; if all passed, promote lot
      const lotId = roll.lot_id;
      const { data: remaining } = await supabase.from("rolls").select("id, qc_status, metres").eq("lot_id", lotId);
      const stillPending = (remaining ?? []).some((r: any) => r.qc_status === "pending");
      if (!stillPending) {
        const passedRolls = (remaining ?? []).filter((r: any) => r.qc_status === "passed");
        const passedMetres = passedRolls.reduce((a: number, r: any) => a + Number(r.metres ?? 0), 0);
        const lot = roll.lots;
        const passedPieces = lot.l_length_metres > 0 ? Math.round(passedMetres / Number(lot.l_length_metres)) : 0;

        await supabase.from("lots").update({
          lot_status: passedRolls.length > 0 ? "active" : "blocked",
          available_pieces: passedPieces, available_metres: +passedMetres.toFixed(2),
          total_pieces: passedPieces, total_metres: +passedMetres.toFixed(2),
        }).eq("id", lotId);

        if (passedRolls.length > 0) {
          // Insert pending inward ledger row that billing will approve
          await supabase.from("stock_ledger").insert({
            entry_type: "inward_grn", quality_id: lot.quality_id, colour_id: lot.colour_id,
            lot_id: lotId, l_value_id: lot.l_value_id, l_length_metres: lot.l_length_metres,
            pieces: passedPieces, metres: +passedMetres.toFixed(2),
            warehouse_id: lot.warehouse_id, approval_status: "pending", is_committed: false,
            proposed_by: user!.id, reference_type: "lot", reference_id: lotId,
            notes: `QC passed for lot ${lot.lot_code}`,
          });
        }
      }
    },
    onSuccess: () => { toast.success("QC decision recorded"); qc.invalidateQueries({ queryKey: ["qc-rolls"] }); qc.invalidateQueries({ queryKey: ["approvals"] }); qc.invalidateQueries({ queryKey: ["lots"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Quality Control" description="Per-roll inspection. Passing all rolls in a lot promotes it and creates a pending inward ledger row for billing approval." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={ShieldCheck} title="No rolls awaiting QC" description="All caught up." /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Roll</TableHead><TableHead>Lot</TableHead><TableHead>Quality / Colour</TableHead>
                <TableHead>Warehouse</TableHead><TableHead className="text-right">Metres</TableHead>
                <TableHead>Received</TableHead><TableHead className="text-right">Decision</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.roll_number}</TableCell>
                    <TableCell className="font-mono text-xs">{r.lots?.lot_code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full border" style={{ background: r.lots?.colours?.hex_preview ?? "#ccc" }} />
                        <span className="font-mono text-xs">{r.lots?.qualities?.quality_code}/{r.lots?.colours?.colour_code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{r.lots?.warehouses?.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(r.metres)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => decide.mutate({ roll: r, status: "passed" })}>
                          <CheckCircle2 className="mr-1 h-3 w-3 text-success" />Pass
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => decide.mutate({ roll: r, status: "failed" })}>
                          <XCircle className="mr-1 h-3 w-3 text-destructive" />Fail
                        </Button>
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