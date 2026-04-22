import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { fmtMetres, fmtNum } from "@/lib/format";
import { AlertTriangle, Flame, PackagePlus, RefreshCw, ShoppingCart, TrendingDown, Warehouse as WarehouseIcon } from "lucide-react";
import { useWarehouses } from "@/hooks/useMasters";
import { Link } from "react-router-dom";

const REFRESH_MS = 15000;

function bandTone(score: number) {
  if (score >= 80) return "bg-success/15 text-success border-success/30";
  if (score >= 60) return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

export default function StockAlerts() {
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const warehouses = useWarehouses();

  const stockByWarehouse = useQuery({
    queryKey: ["alerts-stock-by-wh"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_stock_position")
        .select("warehouse_id,quality_id,colour_id,total_metres,total_pieces");
      if (error) throw error;
      return data ?? [];
    },
  });

  const ats = useQuery({
    queryKey: ["alerts-ats"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_available_to_sell")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const pitch = useQuery({
    queryKey: ["alerts-pitch"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_pitch_score")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const qualities = useQuery({
    queryKey: ["alerts-qualities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qualities")
        .select("id,quality_code,quality_name,reorder_point,safety_stock,max_stock,is_active");
      if (error) throw error;
      return data ?? [];
    },
  });

  const recentReservations = useQuery({
    queryKey: ["alerts-reservations-30d"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("reservations")
        .select("quality_id,colour_id,metres,created_at,status")
        .gte("created_at", since);
      if (error) throw error;
      return data ?? [];
    },
  });

  const billingAlerts = useQuery({
    queryKey: ["alerts-active"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_alerts")
        .select("id,severity,title,message,alert_type,created_at,quality_id,colour_id")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading =
    stockByWarehouse.isLoading || ats.isLoading || pitch.isLoading || qualities.isLoading;

  // Build per-warehouse rollup of total metres per (quality, colour)
  const filteredStock = useMemo(() => {
    const rows = stockByWarehouse.data ?? [];
    if (warehouseId === "all") return rows;
    return rows.filter((r: any) => r.warehouse_id === warehouseId);
  }, [stockByWarehouse.data, warehouseId]);

  // Aggregate by quality/colour for the selected warehouse
  const qualityRollup = useMemo(() => {
    const map = new Map<string, { quality_id: string; total: number }>();
    for (const r of filteredStock as any[]) {
      const key = r.quality_id;
      const cur = map.get(key) ?? { quality_id: r.quality_id, total: 0 };
      cur.total += Number(r.total_metres ?? 0);
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [filteredStock]);

  const atsByKey = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of (ats.data ?? []) as any[]) m.set(`${r.quality_id}:${r.colour_id}`, r);
    return m;
  }, [ats.data]);

  const pitchByKey = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of (pitch.data ?? []) as any[]) m.set(`${r.quality_id}:${r.colour_id}`, r);
    return m;
  }, [pitch.data]);

  // Velocity (metres reserved in last 30 days) per quality/colour
  const velocity = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of (recentReservations.data ?? []) as any[]) {
      const k = `${r.quality_id}:${r.colour_id}`;
      m.set(k, (m.get(k) ?? 0) + Number(r.metres ?? 0));
    }
    return m;
  }, [recentReservations.data]);

  // Low stock at quality level vs reorder/safety
  const lowStock = useMemo(() => {
    const qs = qualities.data ?? [];
    const out: any[] = [];
    for (const q of qs) {
      if (!q.is_active) continue;
      const stockRow = qualityRollup.find((r) => r.quality_id === q.id);
      const onHand = stockRow?.total ?? 0;
      const reorder = Number(q.reorder_point ?? 0);
      const safety = Number(q.safety_stock ?? 0);
      const threshold = reorder > 0 ? reorder : safety;
      if (threshold <= 0) continue;
      if (onHand <= threshold) {
        const severity = onHand <= safety ? "critical" : "warning";
        out.push({
          quality_id: q.id,
          code: q.quality_code,
          name: q.quality_name,
          onHand,
          reorder,
          safety,
          max: Number(q.max_stock ?? 0),
          severity,
          gap: Math.max(reorder, safety) - onHand,
        });
      }
    }
    return out.sort((a, b) => b.gap - a.gap);
  }, [qualities.data, qualityRollup]);

  // High demand colours: top by velocity within selected warehouse footprint
  const highDemand = useMemo(() => {
    const rows = (ats.data ?? []) as any[];
    const enriched = rows.map((r) => {
      const key = `${r.quality_id}:${r.colour_id}`;
      const v = velocity.get(key) ?? 0;
      const p = pitchByKey.get(key)?.pitch_score ?? 0;
      const avail = Number(r.available_metres ?? 0);
      const reserved = Number(r.reserved_metres ?? 0);
      const pressure = avail + reserved > 0 ? reserved / (avail + reserved) : 0;
      // demand score: blended velocity, pressure, low availability
      const demand = v * 0.6 + pressure * 100 * 0.3 + (avail < 50 ? 20 : 0);
      return { ...r, velocity: v, pressure, pitch: p, demand };
    });
    return enriched
      .filter((r) => r.velocity > 0 || r.pressure > 0.3)
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 10);
  }, [ats.data, velocity, pitchByKey]);

  // Reorder candidates: low stock qualities with high demand colours within them
  const reorderCandidates = useMemo(() => {
    return lowStock.slice(0, 8).map((ls) => {
      const colours = ((ats.data ?? []) as any[])
        .filter((r) => r.quality_id === ls.quality_id)
        .map((r) => ({
          ...r,
          velocity: velocity.get(`${r.quality_id}:${r.colour_id}`) ?? 0,
        }))
        .sort((a, b) => b.velocity - a.velocity)
        .slice(0, 3);
      const suggestedQty = Math.max(ls.gap, ls.max ? ls.max - ls.onHand : ls.gap);
      return { ...ls, topColours: colours, suggestedQty };
    });
  }, [lowStock, ats.data, velocity]);

  const counts = {
    low: lowStock.length,
    critical: lowStock.filter((l) => l.severity === "critical").length,
    hot: highDemand.length,
    open: billingAlerts.data?.length ?? 0,
  };

  function refreshAll() {
    stockByWarehouse.refetch();
    ats.refetch();
    pitch.refetch();
    recentReservations.refetch();
    billingAlerts.refetch();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Alerts"
        description="Live low-stock & high-demand signals across your warehouses, refreshed every 15 s."
        actions={
          <div className="flex items-center gap-2">
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-[200px]">
                <WarehouseIcon className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {(warehouses.data ?? []).map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Low-stock qualities</div>
              <div className="text-2xl font-bold tabular-nums text-destructive">{fmtNum(counts.low, 0)}</div>
              <div className="text-xs text-muted-foreground">{counts.critical} below safety</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-warning/10">
              <Flame className="h-5 w-5 text-warning" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">High-demand colours</div>
              <div className="text-2xl font-bold tabular-nums text-warning">{fmtNum(counts.hot, 0)}</div>
              <div className="text-xs text-muted-foreground">By 30-day reservation velocity</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-accent/10">
              <PackagePlus className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Reorder candidates</div>
              <div className="text-2xl font-bold tabular-nums text-accent">{fmtNum(reorderCandidates.length, 0)}</div>
              <div className="text-xs text-muted-foreground">Auto-suggested from gap × velocity</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-secondary">
              <AlertTriangle className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Open billing alerts</div>
              <div className="text-2xl font-bold tabular-nums">{fmtNum(counts.open, 0)}</div>
              <Link to="/app/alerts" className="text-xs text-accent hover:underline">View center →</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" /> Low-stock qualities
          </CardTitle>
          <Badge variant="outline" className="text-xs">{warehouseId === "all" ? "All warehouses" : warehouses.data?.find((w:any)=>w.id===warehouseId)?.name}</Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : lowStock.length === 0 ? (
            <EmptyState icon={TrendingDown} title="All qualities above threshold" description="No quality is below its reorder or safety stock for the current warehouse selection." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quality</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Reorder</TableHead>
                    <TableHead className="text-right">Safety</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((r) => (
                    <TableRow key={r.quality_id}>
                      <TableCell>
                        <div className="font-medium">{r.code}</div>
                        <div className="text-xs text-muted-foreground">{r.name}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMetres(r.onHand)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{fmtMetres(r.reorder)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{fmtMetres(r.safety)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-destructive">{fmtMetres(r.gap)}</TableCell>
                      <TableCell>
                        <Badge variant={r.severity === "critical" ? "destructive" : "secondary"} className="capitalize">{r.severity}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* High demand colours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" /> High-demand colours
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : highDemand.length === 0 ? (
            <EmptyState icon={Flame} title="No demand spikes detected" description="No colour is showing significant 30-day velocity or reservation pressure yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {highDemand.map((r: any) => (
                <div key={`${r.quality_id}:${r.colour_id}`} className="rounded-md border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-1 h-8 w-8 shrink-0 rounded border"
                      style={{ background: r.hex_preview || "hsl(var(--muted))" }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-medium">{r.colour_name}</div>
                        <Badge variant="outline" className={`text-[10px] ${bandTone(r.pitch || 0)}`}>P{Math.round(r.pitch || 0)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{r.quality_code} · {r.colour_code}</div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Avail</div>
                          <div className="font-semibold tabular-nums">{fmtMetres(r.available_metres)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Velocity 30d</div>
                          <div className="font-semibold tabular-nums text-warning">{fmtMetres(r.velocity)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Pressure</div>
                          <div className="font-semibold tabular-nums">{Math.round(r.pressure * 100)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reorder candidates */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-accent" /> Suggested reorder candidates
          </CardTitle>
          <Link to="/app/purchase" className="text-xs text-accent hover:underline">Open Purchase Orders →</Link>
        </CardHeader>
        <CardContent>
          {reorderCandidates.length === 0 ? (
            <EmptyState icon={PackagePlus} title="No reorder needed" description="Stock levels are healthy across all qualities. Suggestions will appear here when on-hand drops below reorder point." />
          ) : (
            <div className="space-y-3">
              {reorderCandidates.map((c: any) => (
                <div key={c.quality_id} className="rounded-md border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{c.code} <span className="text-muted-foreground">— {c.name}</span></div>
                      <div className="text-xs text-muted-foreground">
                        On hand <span className="font-semibold text-foreground">{fmtMetres(c.onHand)}</span> · gap <span className="font-semibold text-destructive">{fmtMetres(c.gap)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested PO</div>
                        <div className="text-lg font-bold tabular-nums text-accent">{fmtMetres(c.suggestedQty)}</div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/app/purchase"><PackagePlus className="mr-2 h-4 w-4" /> Plan PO</Link>
                      </Button>
                    </div>
                  </div>
                  {c.topColours.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.topColours.map((tc: any) => (
                        <div key={tc.colour_id} className="inline-flex items-center gap-2 rounded border bg-muted/40 px-2 py-1 text-xs">
                          <span
                            className="h-3 w-3 rounded-sm border"
                            style={{ background: tc.hex_preview || "hsl(var(--muted))" }}
                          />
                          <span className="font-medium">{tc.colour_name}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="tabular-nums">{fmtMetres(tc.available_metres)} avail</span>
                          {tc.velocity > 0 && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="tabular-nums text-warning">{fmtMetres(tc.velocity)} 30d</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
