import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { fmtDate, fmtMetres } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export default function Jobwork() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["jobwork"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobwork_challans")
        .select("*, qualities(quality_code), colours(colour_code, hex_preview), suppliers(name)")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error; return data ?? [];
    },
  });

  const overdue = (jw: any) => jw.status !== "returned" && jw.promised_return && new Date(jw.promised_return) < new Date();

  return (
    <div>
      <PageHeader title="Jobwork Tracker" description="Outward and return tracking for processors. Overdue items flagged automatically." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={ArrowRightLeft} title="No jobwork in flight" description="Outward challans will appear here." /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Challan</TableHead><TableHead>Sent</TableHead><TableHead>Processor</TableHead>
                <TableHead>Process</TableHead><TableHead>Quality / Colour</TableHead>
                <TableHead className="text-right">Sent</TableHead><TableHead className="text-right">Returned</TableHead>
                <TableHead>Promised</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((jw: any) => (
                  <TableRow key={jw.id}>
                    <TableCell className="font-mono">{jw.challan_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(jw.sent_date)}</TableCell>
                    <TableCell>{jw.suppliers?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{jw.process_type ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full border" style={{ background: jw.colours?.hex_preview ?? "#ccc" }} />
                        <span className="font-mono text-xs">{jw.qualities?.quality_code}/{jw.colours?.colour_code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(jw.metres_sent)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(jw.metres_returned)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(jw.promised_return)}</TableCell>
                    <TableCell>
                      {overdue(jw)
                        ? <Badge variant="destructive">Overdue</Badge>
                        : <StatusBadge status={jw.status} />}
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