import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/reports";
import { Card } from "@/components/ui";
import { StaffWinLossChart, StaffWinRateChart } from "@/components/charts";
import { FileDown } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";

export default function StaffChartsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "win-loss", "leads"],
    queryFn: () => reportsApi.getWinLoss("leads"),
  });

  const winLoss = useExportPdf("Staff-Win-Loss");
  const winRate = useExportPdf("Staff-Win-Rate");

  const pdfBtn = (fn: () => void) => (
    <button onClick={fn} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
      <FileDown className="h-3.5 w-3.5" /> PDF
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Staff Win / Loss (Lead Sources)" action={pdfBtn(winLoss.exportPdf)}>
        <div ref={winLoss.ref}>
          {isLoading ? (
            <div className="flex items-center justify-center h-[350px] text-gray-400">Loading...</div>
          ) : (
            <StaffWinLossChart data={data ?? []} />
          )}
        </div>
      </Card>
      <Card title="Staff Win Rate (Lead Sources)" action={pdfBtn(winRate.exportPdf)}>
        <div ref={winRate.ref}>
          {isLoading ? (
            <div className="flex items-center justify-center h-[350px] text-gray-400">Loading...</div>
          ) : (
            <StaffWinRateChart data={data ?? []} />
          )}
        </div>
      </Card>
    </div>
  );
}
