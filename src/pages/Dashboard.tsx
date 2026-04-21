import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { fmtMetres, fmtNum } from "@/lib/format";
import { AlertTriangle, Boxes, Layers, Palette, ScrollText, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";

function Kpi({ icon: Icon, label, value, hint, tone = "default" }: any) {
  const toneCls = tone === "warn" ? "text-warning" : tone === "danger" ? "text-destructive" : tone === "good" ? "text-success" : "text-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-md bg-secondary">
          <Icon className={`h-5 w-5 ${toneCls}`} />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold tabular-nums ${toneCls}`}>{value}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { activeRole, profile } = useAuth();

  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [qs, cs, lots, ats, alerts, pending] = await Promise.all([
        supabase.from("qualities").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("colours").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("lots").select("id", { count: "exact", head: true }),
        supabase.from("v_available_to_sell").select("available_metres,reserved_metres,total_metres"),
        supabase.from("billing_alerts").select("id,severity,title,alert_type,created_at").eq("is_resolved", false).order("created_at", { ascending: false }).limit(6),
        supabase.from("stock_ledger").select("id", { count: "exact", head: true }).eq("approval_status","pending"),
      ]);
      const totals = (ats.data ?? []).reduce(
        (a: any, r: any) => ({
          available: a.available + Number(r.available_metres ?? 0),
          reserved: a.reserved + Number(r.reserved_metres ?? 0),
          total: a.total + Number(r.total_metres ?? 0),
        }),
        { available: 0, reserved: 0, total: 0 },
      );
      return {
        qualities: qs.count ?? 0,
        colours: cs.count ?? 0,
        lots: lots.count ?? 0,
        totals,
        alerts: alerts.data ?? [],
        pendingApprovals: pending.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${profile?.name?.split(" ")[0] ?? "there"}`}
        description={`Operating as ${activeRole?.toUpperCase()}. Live snapshot of your textile floor.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Layers} label="Active qualities" value={fmtNum(stats.data?.qualities ?? 0, 0)} />
        <Kpi icon={Palette} label="Active colours" value={fmtNum(stats.data?.colours ?? 0, 0)} />
        <Kpi icon={Boxes} label="Available to sell" value={fmtMetres(stats.data?.totals.available)} hint={`of ${fmtMetres(stats.data?.totals.total)} total`} tone="good" />
        <Kpi icon={ScrollText} label="Reserved metres" value={fmtMetres(stats.data?.totals.reserved)} tone="warn" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Kpi icon={ShieldCheck} label="Pending billing approvals" value={fmtNum(stats.data?.pendingApprovals ?? 0, 0)} tone={stats.data?.pendingApprovals ? "warn" : "default"} />
        <Kpi icon={Truck} label="Lots in system" value={fmtNum(stats.data?.lots ?? 0, 0)} />
        <Kpi icon={AlertTriangle} label="Open alerts" value={fmtNum(stats.data?.alerts.length ?? 0, 0)} tone={stats.data?.alerts.length ? "danger" : "default"} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Latest billing alerts</CardTitle>
          <Link to="/app/alerts" className="text-xs text-accent hover:underline">View all →</Link>
        </CardHeader>
        <CardContent>
          {stats.data?.alerts.length ? (
            <ul className="divide-y">
              {stats.data.alerts.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "secondary" : "outline"}>{a.severity}</Badge>
                    <span className="font-medium">{a.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{a.alert_type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">No active alerts. All clear.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Phase 1 module status</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b py-1.5"><span>Auth + role-based shell</span><Badge variant="outline" className="bg-success/10 text-success border-success/30">Live</Badge></div>
          <div className="flex justify-between border-b py-1.5"><span>Database + RLS + ledger</span><Badge variant="outline" className="bg-success/10 text-success border-success/30">Live</Badge></div>
          <div className="flex justify-between border-b py-1.5"><span>Metre Calculator</span><Badge variant="outline" className="bg-success/10 text-success border-success/30">Live</Badge></div>
          <div className="flex justify-between border-b py-1.5"><span>Dashboards (live KPIs)</span><Badge variant="outline" className="bg-success/10 text-success border-success/30">Live</Badge></div>
          <div className="flex justify-between border-b py-1.5"><span>Masters CRUD UIs</span><Badge variant="secondary">Next iteration</Badge></div>
          <div className="flex justify-between border-b py-1.5"><span>Quote → SO → Dispatch → Billing → Invoice</span><Badge variant="secondary">Next iteration</Badge></div>
        </CardContent>
      </Card>
    </div>
  );
}