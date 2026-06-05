import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportToCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const head = columns.map((c) => csvEscape(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => csvEscape(c.accessor(r) ?? "")).join(",")).join("\n");
  const blob = new Blob([`\ufeff${head}\n${body}`], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportToPdf<T>(filename: string, title: string, columns: ExportColumn<T>[], rows: T[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString("en-IN")} · ${rows.length} rows`, 14, 20);
  autoTable(doc, {
    startY: 26,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => {
      const v = c.accessor(r);
      return v == null ? "" : String(v);
    })),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [26, 26, 26], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}