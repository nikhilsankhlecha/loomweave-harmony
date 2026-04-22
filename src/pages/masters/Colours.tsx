import { useMemo, useState } from "react";
import { useQualities, useColoursByQuality } from "@/hooks/useMasters";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { Palette, Search } from "lucide-react";
import { Link } from "react-router-dom";

export default function Colours() {
  const { data: qualities = [] } = useQualities(true);
  const [qid, setQid] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { data: colours = [] } = useColoursByQuality(qid);

  const filtered = useMemo(
    () => colours.filter((c: any) =>
      !search || `${c.colour_code} ${c.colour_name} ${c.colour_family ?? ""}`.toLowerCase().includes(search.toLowerCase())
    ),
    [colours, search]
  );

  return (
    <div>
      <PageHeader title="Colour Master" description="Manage colours within each quality. Pick a quality to view, add and search colours." />
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <Select value={qid} onValueChange={setQid}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select a quality…" /></SelectTrigger>
              <SelectContent>
                {qualities.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quality_code} · {q.quality_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex flex-1 items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Search colours…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
            {qid && <Link to={`/app/qualities/${qid}`} className="text-xs text-accent hover:underline">Open quality detail →</Link>}
          </div>
          {!qid ? <EmptyState icon={Palette} title="Pick a quality" description="Colours always live under a quality." /> :
            filtered.length === 0 ? <EmptyState icon={Palette} title="No colours" description="Add colours from the quality detail page." /> : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-md border p-3">
                    <div className="h-12 w-12 shrink-0 rounded border shadow-inner" style={{ background: c.hex_preview ?? "#ccc" }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-mono text-sm font-semibold">{c.colour_code}</span></div>
                      <div className="truncate text-sm">{c.colour_name}</div>
                      <div className="text-xs text-muted-foreground">{c.colour_family ?? "—"} · {c.shade_band ?? "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}