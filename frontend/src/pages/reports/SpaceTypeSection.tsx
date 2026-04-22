import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/reports";
import { Card } from "@/components/ui";
import { Building2, FileDown } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";

const SPACE_LABELS: Record<string, string> = {
  CLOSED_OFFICE: "Closed Office",
  ABC_ADDRESS: "Abc Address",
  ABC_FLEX: "Abc Flex",
  ABC_ELITE: "Abc Elite",
  WORKSTATION: "Workstation",
  OFFICE: "Office",
};

export default function SpaceTypeSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "space-type-breakdown"],
    queryFn: () => reportsApi.getSpaceTypeBreakdown(),
  });

  const { ref, exportPdf } = useExportPdf("Deals-by-Space-Type");

  return (
    <Card
      title="Deals by Space Type"
      description="Breakdown across all space categories"
      action={
        <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <FileDown className="h-3.5 w-3.5" /> PDF
        </button>
      }
    >
      <div ref={ref} className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Space Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Deals</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Won</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : data?.length ? (
              <>
                {data.map((row) => (
                  <tr key={row.spaceType}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {SPACE_LABELS[row.spaceType] || row.spaceType}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.count}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">{row.won}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{row.lost}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">QAR {row.totalValue.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">Total</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{data.reduce((s, r) => s + r.count, 0)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">{data.reduce((s, r) => s + r.won, 0)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{data.reduce((s, r) => s + r.lost, 0)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">QAR {data.reduce((s, r) => s + r.totalValue, 0).toLocaleString()}</td>
                </tr>
              </>
            ) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
