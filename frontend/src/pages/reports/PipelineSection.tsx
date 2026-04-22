import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/reports";
import { Card } from "@/components/ui";
import { FileDown } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-gray-200 text-gray-800",
  NEW: "bg-blue-200 text-blue-800",
  QUALIFIED: "bg-indigo-200 text-indigo-800",
  MEETING: "bg-purple-200 text-purple-800",
  PROPOSAL: "bg-yellow-200 text-yellow-800",
  NEGOTIATION: "bg-orange-200 text-orange-800",
  CONTRACT: "bg-amber-200 text-amber-800",
  WON: "bg-green-200 text-green-800",
  LOST: "bg-red-200 text-red-800",
};

const SPACE_LABELS: Record<string, string> = {
  CLOSED_OFFICE: "Closed Office",
  ABC_ADDRESS: "Abc Address",
  ABC_FLEX: "Abc Flex",
  ABC_ELITE: "Abc Elite",
};

const LOCATION_LABELS: Record<string, string> = {
  BARWA_ALSADD: "Barwa Al Sadd",
  ELEMENT_WESTBAY: "Element Westbay",
  MARINA50_LUSAIL: "Marina 50 Lusail",
};

export default function PipelineSection() {
  const { ref, exportPdf } = useExportPdf("Deal-Pipeline");
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "pipeline"],
    queryFn: () => reportsApi.getPipeline(),
  });

  const stages = data ?? [];

  // Find the max deal count across stages to pad columns
  const maxDeals = Math.max(...stages.map((s) => s.deals.length), 0);

  return (
    <Card title="Deal Pipeline by Stage" action={
      <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
        <FileDown className="h-3.5 w-3.5" /> PDF
      </button>
    }>
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px] text-gray-400">Loading...</div>
      ) : stages.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-gray-400">No pipeline data</div>
      ) : (
        <div ref={ref} className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                {stages.map((stage) => (
                  <th key={stage.stage} className="px-3 py-3 text-center border-b-2 border-gray-200">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[stage.stage] || "bg-gray-100 text-gray-800"}`}>
                      {stage.stage}
                    </span>
                    <div className="mt-1 text-xs text-gray-500">{stage.count} deals</div>
                    <div className="text-xs font-medium text-gray-700">QAR {stage.totalValue.toLocaleString()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxDeals }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-b border-gray-100">
                  {stages.map((stage) => {
                    const deal = stage.deals[rowIdx];
                    return (
                      <td key={stage.stage} className="px-2 py-2 align-top">
                        {deal ? (
                          <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm text-xs space-y-1.5">
                            <div className="font-semibold text-gray-900 leading-tight">{deal.title}</div>
                            <div className="text-gray-500">{deal.clientName}</div>
                            <div className="font-bold text-blue-700">QAR {deal.value.toLocaleString()}</div>
                            <div className="text-gray-500">
                              <span className="font-medium text-gray-700">Rep:</span> {deal.ownerName}
                            </div>
                            {deal.brokerName && (
                              <div className="text-gray-500">
                                <span className="font-medium text-gray-700">Broker:</span> {deal.brokerName}
                              </div>
                            )}
                            {deal.location && (
                              <div className="text-gray-400">
                                {LOCATION_LABELS[deal.location] || deal.location}
                              </div>
                            )}
                            {deal.spaceType && (
                              <div className="text-gray-400">
                                {SPACE_LABELS[deal.spaceType] || deal.spaceType}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
