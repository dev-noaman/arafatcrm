import { useRef, useCallback } from "react";

function buildReportHtml(title: string, date: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: landscape; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* ── Header ── */
    .report-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #465FFF; }
    .report-header .brand { font-size: 22px; font-weight: 800; color: #465FFF; letter-spacing: -0.5px; }
    .report-header .subtitle { font-size: 11px; color: #9ca3af; margin-top: 2px; letter-spacing: 0.5px; text-transform: uppercase; }
    .report-header .meta { text-align: right; }
    .report-header .meta .title { font-size: 18px; font-weight: 700; color: #111827; }
    .report-header .meta .date { font-size: 11px; color: #6b7280; margin-top: 2px; }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
    thead th {
      background: #f0f1ff; color: #465FFF; font-weight: 700; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.5px;
      padding: 10px 14px; text-align: left; border-bottom: 2px solid #465FFF;
    }
    tbody td { padding: 9px 14px; border-bottom: 1px solid #e5e7eb; color: #374151; }
    tbody tr:nth-child(even) { background: #fafbff; }
    tbody tr:hover { background: #f0f1ff; }

    /* ── Totals row ── */
    tr.totals td { background: #f0f1ff !important; font-weight: 700; color: #111827; border-top: 2px solid #c7d2fe; border-bottom: none; }

    /* ── Value colors ── */
    .text-green-600, .text-success-600 { color: #16a34a; font-weight: 600; }
    .text-red-600 { color: #dc2626; font-weight: 600; }
    .text-blue-600 { color: #2563eb; }
    .text-emerald-600, .text-emerald-700 { color: #059669; font-weight: 600; }
    .text-purple-600 { color: #9333ea; }
    .text-indigo-600 { color: #4f46e5; }

    /* ── Badges ── */
    span[class*="bg-green-100"] { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    span[class*="bg-red-100"] { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    span[class*="bg-blue-200"] { background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    span[class*="rounded-full"] { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }

    /* ── Weight helpers ── */
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-bold, .font-bold { font-weight: 700; }
    .whitespace-nowrap { white-space: nowrap; }
    .bg-gray-50 { background: #f9fafb; }

    /* ── Layout helpers from Tailwind that appear in content ── */
    .flex { display: flex; }
    .items-center { align-items: center; }
    .gap-2 { gap: 8px; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: 1fr 1fr; }
    .divide-y > * + * { border-top: 1px solid #e5e7eb; }
    .border-b { border-bottom: 1px solid #e5e7eb; }
    .px-4 { padding-left: 16px; padding-right: 16px; }
    .py-3 { padding-top: 12px; padding-bottom: 12px; }
    .text-sm { font-size: 14px; }
    .text-xs { font-size: 12px; }
    .text-gray-900 { color: #111827; }
    .text-gray-500, .text-gray-400 { color: #6b7280; }
    .text-gray-600 { color: #4b5563; }
    .text-gray-100 { color: #f3f4f6; }
    .text-gray-300 { color: #d1d5db; }
    .uppercase { text-transform: uppercase; }
    .leading-tight { line-height: 1.25; }
    .text-right { text-align: right; }
    .overflow-x-auto { overflow-x: auto; }

    /* ── Pipeline table ── */
    .pipeline-table { table-layout: fixed; }
    .pipeline-table th { vertical-align: top; text-align: center; padding: 10px 8px; }
    .pipeline-table td { vertical-align: top; padding: 6px 4px; border: none; }
    .deal-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; margin-bottom: 6px; background: #fff; }
    .deal-card .deal-title { font-weight: 700; font-size: 11px; color: #111827; }
    .deal-card .deal-detail { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .deal-card .deal-value { font-weight: 700; font-size: 12px; color: #465FFF; margin-top: 4px; }
    .stage-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 700; margin-bottom: 4px; }
    .stage-count { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .stage-value { font-size: 10px; font-weight: 600; color: #374151; }

    /* ── Hide SVGs ── */
    svg { display: none !important; }

    /* ── Print ── */
    @media print { body { padding: 0; } @page { size: landscape; margin: 12mm; } }

    /* ── Footer ── */
    .report-footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: right; }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand">ArafatCRM</div>
      <div class="subtitle">Real Estate CRM Reports</div>
    </div>
    <div class="meta">
      <div class="title">${title}</div>
      <div class="date">Generated ${date}</div>
    </div>
  </div>
  <div class="report-body">${bodyHtml}</div>
  <div class="report-footer">ArafatCRM &mdash; Confidential &mdash; Page 1</div>
</body>
</html>`;
}

export function useExportPdf(title: string) {
  const ref = useRef<HTMLDivElement>(null);

  const exportPdf = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const bodyHtml = el.outerHTML.replace(/<svg[^>]*>.*?<\/svg>/gs, "");
    const date = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
    const fullHtml = buildReportHtml(title, date, bodyHtml);

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(fullHtml);
    win.document.close();

    win.onload = () => {
      setTimeout(() => {
        win.print();
        setTimeout(() => win.close(), 100);
      }, 400);
    };
  }, [title]);

  return { ref, exportPdf };
}
