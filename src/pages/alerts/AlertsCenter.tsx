import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const sevTone: Record<string, string> = {
  info: "bg-accent/10 text-accent border-accent/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function AlertsCenter() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["alerts-center"],
    queryFn: async () => {
      const { data, error } = await supabase.from("billing_alerts")
        .select("*, qualities(quality_code, quality_name), colours(colour_code, colour_name, hex_preview)")
        .order("is_resolved", { ascending: true })
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error; return data ?? [];
    },
    refetchInterval: 30000,
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("billing_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: user!.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Resolved"); qc.invalidateQueries({ queryKey: ["alerts-center"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const open = data.filter((a: any) => !a.is_resolved);
  const resolved = data.filter((a: any) => a.is_resolved);

  const Section = ({ title, list, empty }: any) => (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title} ({list.length})</div>
        {list.length === 0 ? (
          <EmptyState icon={Bell} title={empty} />
        ) : (
          <ul className="divide-y">
            {list.map((a: any) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Badge variant="outline" className={sevTone[a.severity]}>{a.severity}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{a.alert_type}</span>
                    {a.qualities && <span className="font-mono">{a.qualities.quality_code}</span>}
                    {a.colours && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full border" style={{ background: a.colours.hex_preview ?? "#ccc" }} />
                        <span className="font-mono">{a.colours.colour_code}</span>
                      </span>
                    )}
                    <span>· {fmtDate(a.created_at)}</span>
                  </div>
                  {a.message && <div className="mt-1 text-xs text-muted-foreground">{a.message}</div>}
                </div>
                {!a.is_resolved && (
                  <div className="flex items-center gap-1.5">
                    {(a.alert_type === "low_stock" || a.alert_type === "procurement_gap") && (
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <Link to="/app/purchase"><ShoppingCart className="mr-1 h-3 w-3" />Plan PO</Link>
                      </Button>
                    )}
                    <Button size="sm" className="h-7 text-xs" onClick={() => resolve.mutate(a.id)}>
                      <CheckCircle2 className="mr-1 h-3 w-3" />Resolve
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Alerts Center" description="Live operational alerts. Polled every 30s. Resolve once acted on." />
      {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> : (
        <>
          <Section title="Open" list={open} empty="All clear — no open alerts." />
          <Section title="Resolved (recent)" list={resolved.slice(0, 20)} empty="Nothing resolved yet." />
        </>
      )}
    </div>
  );
}