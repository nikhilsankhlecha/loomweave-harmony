import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, FileDown, Plus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtINR, fmtMetres, generateCode } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const GST_PCT = 5; // textile default; split CGST 2.5 + SGST 2.5 (assume intra-state)

export default function Invoices() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const canBill = hasRole(["billing", "admin"]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices")
        .select("*, customers(name, gstin, city, state), sales_orders(order_code), dispatch_notes(dn_code)")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error; return data ?? [];
    },
  });

  const dispatchedReady = useQuery({
    queryKey: ["dispatched-uninvoiced"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dispatch_notes")
        .select("*, sales_orders(*, customers(*), sales_order_items(*, qualities(quality_code, quality_name), colours(colour_code, colour_name)))")
        .eq("status", "dispatched");
      if (error) throw error;
      // exclude DNs that already have an invoice
      const dnIds = (data ?? []).map((d: any) => d.id);
      if (dnIds.length === 0) return [];
      const { data: invs } = await supabase.from("invoices").select("dispatch_note_id").in("dispatch_note_id", dnIds);
      const used = new Set((invs ?? []).map((i: any) => i.dispatch_note_id));
      return (data ?? []).filter((d: any) => !used.has(d.id));
    },
  });

  const generateInvoice = useMutation({
    mutationFn: async (dn: any) => {
      const so = dn.sales_orders;
      const items = so.sales_order_items ?? [];
      const subtotal = Number(so.total_value ?? items.reduce((a: number, i: any) => a + Number(i.ordered_metres) * Number(i.unit_rate || 0), 0));
      const cgst = +(subtotal * (GST_PCT / 2 / 100)).toFixed(2);
      const sgst = cgst;
      const total = +(subtotal + cgst + sgst).toFixed(2);
      const code = generateCode("INV");
      const due = new Date(); due.setDate(due.getDate() + 30);
      const { error } = await supabase.from("invoices").insert({
        invoice_code: code, customer_id: so.customer_id, sales_order_id: so.id, dispatch_note_id: dn.id,
        billing_user_id: user!.id, total_pieces: dn.total_pieces ?? so.total_pieces, total_metres: dn.total_metres ?? so.total_metres,
        subtotal, cgst, sgst, igst: 0, transport_charges: 0, total,
        payment_due_date: due.toISOString().slice(0, 10), status: "issued",
      });
      if (error) throw error;
      await supabase.from("sales_orders").update({ status: "invoiced" }).eq("id", so.id);
      return code;
    },
    onSuccess: (code) => { toast.success(`Invoice ${code} issued`); qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["dispatched-uninvoiced"] }); qc.invalidateQueries({ queryKey: ["orders"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadPdf = async (inv: any) => {
    const { data: so } = await supabase.from("sales_orders")
      .select("*, sales_order_items(*, qualities(quality_code, quality_name), colours(colour_code, colour_name), l_values(l_code))")
      .eq("id", inv.sales_order_id).maybeSingle();
    const items = so?.sales_order_items ?? [];
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("SIDHARTH CREATION", 14, 18);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("Textile manufacturing & trading", 14, 24);
    doc.text("GSTIN: 27AAAAA0000A1Z5", 14, 29);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", 200, 18, { align: "right" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Invoice #: ${inv.invoice_code}`, 200, 24, { align: "right" });
    doc.text(`Date: ${fmtDate(inv.invoice_date)}`, 200, 29, { align: "right" });
    doc.text(`Due: ${fmtDate(inv.payment_due_date)}`, 200, 34, { align: "right" });

    doc.setFont("helvetica", "bold"); doc.text("Bill to:", 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(inv.customers?.name ?? "—", 14, 47);
    if (inv.customers?.city) doc.text(`${inv.customers.city}${inv.customers.state ? `, ${inv.customers.state}` : ""}`, 14, 52);
    if (inv.customers?.gstin) doc.text(`GSTIN: ${inv.customers.gstin}`, 14, 57);

    autoTable(doc, {
      startY: 65,
      head: [["#", "Quality", "Colour", "L", "Pieces", "Metres", "Rate /m", "Value"]],
      body: items.map((i: any, idx: number) => [
        idx + 1,
        i.qualities?.quality_code ?? "—",
        i.colours?.colour_code ?? "—",
        i.l_values?.l_code ?? "—",
        Number(i.ordered_pieces).toLocaleString("en-IN"),
        Number(i.ordered_metres).toFixed(2),
        Number(i.unit_rate || 0).toFixed(2),
        (Number(i.ordered_metres) * Number(i.unit_rate || 0)).toFixed(2),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    const right = (label: string, val: string, y: number) => { doc.text(label, 150, y); doc.text(val, 200, y, { align: "right" }); };
    right("Subtotal", `₹ ${Number(inv.subtotal).toFixed(2)}`, finalY);
    right(`CGST (${GST_PCT/2}%)`, `₹ ${Number(inv.cgst).toFixed(2)}`, finalY + 5);
    right(`SGST (${GST_PCT/2}%)`, `₹ ${Number(inv.sgst).toFixed(2)}`, finalY + 10);
    if (Number(inv.igst) > 0) right("IGST", `₹ ${Number(inv.igst).toFixed(2)}`, finalY + 15);
    if (Number(inv.transport_charges) > 0) right("Transport", `₹ ${Number(inv.transport_charges).toFixed(2)}`, finalY + 20);
    doc.setFont("helvetica", "bold");
    right("TOTAL", `₹ ${Number(inv.total).toFixed(2)}`, finalY + 26);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Goods once sold cannot be returned. Subject to local jurisdiction.", 14, 285);
    doc.save(`${inv.invoice_code}.pdf`);
  };

  return (
    <div>
      <PageHeader title="Invoices" description="Generated post-approved-dispatch. Download tax-invoice PDF." />

      {canBill && (dispatchedReady.data?.length ?? 0) > 0 && (
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ready to invoice</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dispatchedReady.data!.map((dn: any) => (
                <div key={dn.id} className="flex items-center justify-between rounded-md border bg-secondary/30 p-2.5">
                  <div className="text-xs">
                    <div className="font-mono">{dn.dn_code}</div>
                    <div className="text-muted-foreground">{dn.sales_orders?.customers?.name} · {fmtMetres(dn.total_metres)}</div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => generateInvoice.mutate(dn)} disabled={generateInvoice.isPending}>
                    <Plus className="mr-1 h-3 w-3" />Invoice
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> :
            data.length === 0 ? <EmptyState icon={Receipt} title="No invoices yet" description="Approve a dispatch and invoice it from above." /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead>
                <TableHead>Order</TableHead><TableHead className="text-right">Metres</TableHead>
                <TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono">{inv.invoice_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(inv.invoice_date)}</TableCell>
                    <TableCell>{inv.customers?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{inv.sales_orders?.order_code ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMetres(inv.total_metres)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(inv.subtotal)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(Number(inv.cgst) + Number(inv.sgst) + Number(inv.igst))}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtINR(inv.total)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => downloadPdf(inv)}><FileDown className="h-3.5 w-3.5" /></Button>
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