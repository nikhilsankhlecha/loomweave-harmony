import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Boxes, ArrowRight, Download, FileText, FileSpreadsheet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToCsv, exportToPdf } from "@/lib/export";
import { EmptyState } from "@/components/EmptyState";
import { fmtMetres } from "@/lib/format";
import { Link } from "react-router-dom";

function PitchBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "bg-success/15 text-success border-success/30"
    : score >= 60 ? "bg-warning/15 text-warning border-warning/30"
    : "bg-destructive/15 text-destructive border-destructive/30";
  return <Badge variant="outline" className={tone}>Pitch {score}</Badge>;
}

export default function SalesBrowser() {
  const [search, setSearch] = useState("");
  const [minMetres, setMinMetres] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 180);

  const { data = [], isLoading } = useQuery({
    queryKey: ["browser"],
    queryFn: async () => {
      const [{ data: avail }, { data: pitch }] = await Promise.all([
        supabase.from("v_available_to_sell").select("*"),
        supabase.from("v_pitch_score").select("*"),
      ]);
      const pitchMap = new Map((pitch ?? []).map((p: any) => [`${p.quality_id}:${p.colour_id}`, p.pitch_score]));
      return (avail ?? []).map((r: any) => ({ ...r, pitch_score: pitchMap.get(`${r.quality_id}:${r.colour_id}`) ?? 0 }));
    },
  });

  const filtered = useMemo(
    () => data
      .filter((r: any) => Number(r.available_metres ?? 0) >= minMetres)
      .filter((r: any) => !debouncedSearch || `${r.quality_code} ${r.quality_name} ${r.colour_code} ${r.colour_name} ${r.colour_family ?? ""} ${r.shade_band ?? ""}`.toLowerCase().includes(debouncedSearch.toLowerCase()))
      .sort((a: any, b: any) => {
        const qa = String(a.quality_code ?? "");
        const qb = String(b.quality_code ?? "");
        const qcmp = qa.localeCompare(qb, undefined, { numeric: true, sensitivity: "base" });
        if (qcmp !== 0) return qcmp;
        const ca = String(a.colour_code ?? "");
        const cb = String(b.colour_code ?? "");
        return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: "base" });
      }),
    [data, debouncedSearch, minMetres]
  );

  return (
    <div>
      <PageHeader title="Stock Browser" description="Available-to-sell across all qualities and colours, ranked by pitch priority score." />
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2 border-b pb-3">
            <div className="flex flex-1 items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input className="max-w-sm" placeholder="Search quality, colour, family, shade…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Min metres</span><Input type="number" className="w-24" value={minMetres} onChange={(e) => setMinMetres(Number(e.target.value) || 0)} /></div>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} sellable SKUs</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={filtered.length === 0}><Download className="mr-1 h-4 w-4" />Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportToPdf("stock-browser", "Stock Browser", [
                  { header: "Quality Code", accessor: (r: any) => r.quality_code },
                  { header: "Quality", accessor: (r: any) => r.quality_name },
                  { header: "Colour Code", accessor: (r: any) => r.colour_code },
                  { header: "Colour", accessor: (r: any) => r.colour_name },
                  { header: "Family", accessor: (r: any) => r.colour_family ?? "" },
                  { header: "Shade", accessor: (r: any) => r.shade_band ?? "" },
                  { header: "Available (m)", accessor: (r: any) => Number(r.available_metres ?? 0).toFixed(2) },
                  { header: "Reserved (m)", accessor: (r: any) => Number(r.reserved_metres ?? 0).toFixed(2) },
                  { header: "Total (m)", accessor: (r: any) => Number(r.total_metres ?? 0).toFixed(2) },
                  { header: "Pitch", accessor: (r: any) => r.pitch_score ?? 0 },
                ], filtered)}>
                  <FileText className="mr-2 h-4 w-4" />Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCsv("stock-browser", [
                  { header: "Quality Code", accessor: (r: any) => r.quality_code },
                  { header: "Quality", accessor: (r: any) => r.quality_name },
                  { header: "Colour Code", accessor: (r: any) => r.colour_code },
                  { header: "Colour", accessor: (r: any) => r.colour_name },
                  { header: "Family", accessor: (r: any) => r.colour_family ?? "" },
                  { header: "Shade", accessor: (r: any) => r.shade_band ?? "" },
                  { header: "Available (m)", accessor: (r: any) => Number(r.available_metres ?? 0).toFixed(2) },
                  { header: "Reserved (m)", accessor: (r: any) => Number(r.reserved_metres ?? 0).toFixed(2) },
                  { header: "Total (m)", accessor: (r: any) => Number(r.total_metres ?? 0).toFixed(2) },
                  { header: "Pitch", accessor: (r: any) => r.pitch_score ?? 0 },
                ], filtered)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />Export to Excel / CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            filtered.length === 0 ? <EmptyState icon={Boxes} title="Nothing to sell" description="Adjust filters or check stock levels." /> : (
              <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((r: any) => {
                  const pressure = Number(r.total_metres) > 0 ? Math.round((Number(r.reserved_metres ?? 0) / Number(r.total_metres)) * 100) : 0;
                  return (
                    <div key={`${r.quality_id}-${r.colour_id}`} className="flex flex-col gap-2 rounded-md border p-3 transition hover:shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 shrink-0 rounded border shadow-inner" style={{ background: r.hex_preview ?? "#ccc" }} />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs text-muted-foreground">{r.quality_code} · {r.colour_code}</div>
                          <div className="truncate font-semibold">{r.colour_name}</div>
                          <div className="text-xs text-muted-foreground">{r.quality_name}</div>
                        </div>
                        <PitchBadge score={r.pitch_score ?? 0} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 border-t pt-2 text-center text-xs">
                        <div><div className="text-muted-foreground">Available</div><div className="font-semibold tabular-nums text-success">{fmtMetres(r.available_metres)}</div></div>
                        <div><div className="text-muted-foreground">Reserved</div><div className="font-semibold tabular-nums text-warning">{fmtMetres(r.reserved_metres)}</div></div>
                        <div><div className="text-muted-foreground">Total</div><div className="font-semibold tabular-nums">{fmtMetres(r.total_metres)}</div></div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">Reservation pressure: <span className={pressure >= 60 ? "font-semibold text-destructive" : pressure >= 30 ? "font-semibold text-warning" : "font-semibold text-success"}>{pressure}%</span></span>
                        <Button asChild size="sm" variant="outline"><Link to={`/app/quotes/new?quality=${r.quality_id}&colour=${r.colour_id}`}>Quote <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}