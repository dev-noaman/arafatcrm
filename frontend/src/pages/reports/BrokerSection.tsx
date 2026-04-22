import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/reports";
import { Card } from "@/components/ui";
import { Award, FileDown } from "lucide-react";
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

export default function BrokerSection() {
  const [month, setMonth] = useState("");
  const { ref, exportPdf } = useExportPdf("Broker-Performance-Report");
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "broker-performance", month],
    queryFn: () => reportsApi.getBrokerPerformance(month || undefined),
  });

  return (
    <Card
      title="Broker Performance Report"
      action={
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Broker</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deals</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Won</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : data?.length ? (
              <>
                {data.map((report) => (
                  <tr key={report.brokerId}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.brokerName || "Broker"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{report.totalDeals}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">{report.won}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{report.lost}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">{report.active}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.winRate >= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {report.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">QAR {report.totalValue.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-emerald-600">QAR {report.totalCommission.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">Total</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{data.reduce((s, r) => s + r.totalDeals, 0)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">{data.reduce((s, r) => s + r.won, 0)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{data.reduce((s, r) => s + r.lost, 0)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">{data.reduce((s, r) => s + r.active, 0)}</td>
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
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">QAR {data.reduce((s, r) => s + r.totalValue, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-emerald-600">QAR {data.reduce((s, r) => s + r.totalCommission, 0).toLocaleString()}</td>
                </tr>
              </>
            ) : (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
