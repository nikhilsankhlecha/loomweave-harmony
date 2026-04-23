import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtINR, fmtMetres } from "@/lib/format";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

export default function Reports() {
  const { data: stockByQuality = [] } = useQuery({
    queryKey: ["report-stock-quality"],
    queryFn: async () => {
      const [{ data: qs }, { data: ats }] = await Promise.all([
        supabase.from("qualities").select("id, quality_code"),
        supabase.from("v_available_to_sell").select("quality_id, available_metres, reserved_metres, total_metres"),
      ]);
      const map = new Map<string, any>();
      (qs ?? []).forEach((q: any) => map.set(q.id, { quality_code: q.quality_code, available: 0, reserved: 0, total: 0 }));
      (ats ?? []).forEach((a: any) => {
        const r = map.get(a.quality_id);
        if (!r) return;
        r.available += Number(a.available_metres ?? 0);
        r.reserved += Number(a.reserved_metres ?? 0);
        r.total += Number(a.total_metres ?? 0);
      });
      return Array.from(map.values()).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
    },
  });

  const { data: salesVelocity = [] } = useQuery({
    queryKey: ["report-sales-velocity"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: orders } = await supabase.from("sales_orders").select("created_at, total_value, total_metres").gte("created_at", since);
      const buckets: Record<string, { day: string; metres: number; value: number }> = {};
      (orders ?? []).forEach((o: any) => {
        const d = new Date(o.created_at).toISOString().slice(5, 10);
        if (!buckets[d]) buckets[d] = { day: d, metres: 0, value: 0 };
        buckets[d].metres += Number(o.total_metres ?? 0);
        buckets[d].value += Number(o.total_value ?? 0);
      });
      return Object.values(buckets).sort((a, b) => a.day.localeCompare(b.day));
    },
  });

  const { data: dispatchPerf } = useQuery({
    queryKey: ["report-dispatch-perf"],
    queryFn: async () => {
      const { data } = await supabase.from("dispatch_notes").select("status");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((d: any) => { counts[d.status] = (counts[d.status] ?? 0) + 1; });
      return counts;
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Reports & Analytics" description="Operational reporting across stock, sales, and dispatch." />

      <Card>
        <CardHeader><CardTitle className="text-base">Stock position by quality (metres)</CardTitle></CardHeader>
        <CardContent>
          {stockByQuality.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No stock yet.</div> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockByQuality}>
                  <XAxis dataKey="quality_code" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="available" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  <Bar dataKey="reserved" fill="hsl(var(--accent))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Sales velocity (30 days)</CardTitle></CardHeader>
          <CardContent>
            {salesVelocity.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No orders in the last 30 days.</div> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesVelocity}>
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} formatter={(v: any) => fmtMetres(Number(v))} />
                    <Bar dataKey="metres" radius={[4,4,0,0]}>
                      {salesVelocity.map((_: any, i: number) => <Cell key={i} fill="hsl(var(--accent))" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dispatch performance</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {Object.entries(dispatchPerf ?? {}).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between py-2">
                  <span className="capitalize">{status.split("_").join(" ")}</span>
                  <span className="font-semibold tabular-nums">{count as number}</span>
                </li>
              ))}
              {Object.keys(dispatchPerf ?? {}).length === 0 && <li className="py-6 text-center text-xs text-muted-foreground">No dispatch data yet.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}