import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/reports";
import { Card } from "@/components/ui";
import { Users, FileDown } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";

const MONTHS = (() => {
  const opts = [{ value: "", label: "All Time" }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value: val, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
  }
  return opts;
})();

export default function OverallSummarySection() {
  const [month, setMonth] = useState("");
  const { ref, exportPdf } = useExportPdf("Overall-Summary-Report");

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "staff-performance", month],
    queryFn: () => reportsApi.getStaffPerformance(month || undefined),
  });

  return (
    <Card
      title="Overall Summary Report"
      description="Staff performance with deal amounts"
      action={
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      }
    >
      <div ref={ref} className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Won</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Won Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : data?.length ? (
              <>
                {data.map((row) => {
                  const lostRate = row.won + row.lost > 0
                    ? Math.round((row.lost / (row.won + row.lost)) * 1000) / 10
                    : 0;
                  return (
                    <tr key={row.userId}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.totalAssigned}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">{row.won}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.winRate >= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {row.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">QAR {row.wonValue.toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{row.lost}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600">QAR {row.lostValue.toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lostRate <= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {lostRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">{row.active}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">Total</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{data.reduce((s, r) => s + r.totalAssigned, 0)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">{data.reduce((s, r) => s + r.won, 0)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {(() => {
                      const tw = data.reduce((s, r) => s + r.won, 0);
                      const tl = data.reduce((s, r) => s + r.lost, 0);
                      const rate = tw + tl > 0 ? (tw / (tw + tl)) * 100 : 0;
                      return (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rate >= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {rate.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">QAR {data.reduce((s, r) => s + r.wonValue, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{data.reduce((s, r) => s + r.lost, 0)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600">QAR {data.reduce((s, r) => s + r.lostValue, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {(() => {
                      const tw = data.reduce((s, r) => s + r.won, 0);
                      const tl = data.reduce((s, r) => s + r.lost, 0);
                      const rate = tw + tl > 0 ? (tl / (tw + tl)) * 100 : 0;
                      return (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rate <= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {rate.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">{data.reduce((s, r) => s + r.active, 0)}</td>
                </tr>
              </>
            ) : (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
