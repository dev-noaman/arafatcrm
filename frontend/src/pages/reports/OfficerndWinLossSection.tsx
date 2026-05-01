import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { officerndReportsApi } from "@/api/officernd-reports";
import { Card, SkeletonChart } from "@/components/ui";
import { FileDown, AlertTriangle } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";
import { MONTHS } from "./months";
import { OfficerndWinLossChart } from "@/components/charts";

export default function OfficerndWinLossSection() {
  const [month, setMonth] = useState("");
  const { ref, exportPdf } = useExportPdf("OfficeRnD-Win-Loss");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "officernd", "win-loss", month],
    queryFn: () => officerndReportsApi.getReportWinLoss(month || undefined),
  });

  return (
    <Card
      title="OfficeRnD Renewals — Staff Win / Loss"
      description="Per-staff win/loss for OfficeRnD-linked deals only"
      action={
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="min-h-[44px] cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button type="button" onClick={exportPdf} className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500">
            <FileDown aria-hidden="true" className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      }
    >
      <div ref={ref}>
        {isLoading ? <SkeletonChart />
          : error ? (
            <div role="alert" className="flex h-[350px] flex-col items-center justify-center gap-3 text-sm text-gray-600">
              <AlertTriangle aria-hidden="true" className="h-8 w-8 text-red-500" />
              <p>Couldn't load win/loss summary.</p>
              <button type="button" onClick={() => refetch()} className="min-h-[44px] cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500">Try again</button>
            </div>
          )
          : <OfficerndWinLossChart data={data ?? []} />
        }
      </div>
    </Card>
  );
}
