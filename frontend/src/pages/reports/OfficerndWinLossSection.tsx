import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { officerndReportsApi } from "@/api/officernd-reports";
import { Card } from "@/components/ui";
import { FileDown } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";
import { MONTHS } from "./months";
import { OfficerndWinLossChart } from "@/components/charts";

export default function OfficerndWinLossSection() {
  const [month, setMonth] = useState("");
  const { ref, exportPdf } = useExportPdf("OfficeRnD-Win-Loss");
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "officernd", "win-loss", month],
    queryFn: () => officerndReportsApi.getReportWinLoss(month || undefined),
  });

  return (
    <Card
      title="OfficeRnD Renewals — Staff Win / Loss"
      description="Per-staff win/loss for OfficeRnD-linked deals only"
      action={
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      }
    >
      <div ref={ref}>
        {isLoading
          ? <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
          : <OfficerndWinLossChart data={data ?? []} />
        }
      </div>
    </Card>
  );
}
