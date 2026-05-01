import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { officerndReportsApi } from "@/api/officernd-reports";
import { Card, SkeletonTableRows } from "@/components/ui";
import { Users, FileDown, AlertTriangle } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";
import { MONTHS } from "./months";

export default function OfficerndStaffSummarySection() {
  const [month, setMonth] = useState("");
  const { ref, exportPdf } = useExportPdf("OfficeRnD-Staff-Summary");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", "officernd", "staff-summary", month],
    queryFn: () => officerndReportsApi.getReportStaffSummary(month || undefined),
  });

  return (
    <Card
      title="OfficeRnD Renewals — Per Staff"
      description="Assigned, pipelined, won, and lost counts for OfficeRnD renewals"
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
      <div ref={ref} className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pipelined</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Won</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
            {isLoading
              ? <SkeletonTableRows rows={4} cols={6} />
              : error
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8">
                      <div role="alert" className="flex flex-col items-center gap-2 text-sm text-gray-600">
                        <AlertTriangle aria-hidden="true" className="h-6 w-6 text-red-500" />
                        <p>Couldn't load per-staff summary.</p>
                        <button type="button" onClick={() => refetch()} className="min-h-[44px] cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500">Try again</button>
                      </div>
                    </td>
                  </tr>
                )
              : data?.length
                ? data.map((row) => (
                  <tr key={row.userId}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users aria-hidden="true" className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.userName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.assigned}</td>
                    <td className="px-4 py-3 text-sm text-purple-600">{row.pipelined}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{row.won}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{row.lost}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.winRate >= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {row.winRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
                : <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No data available</td></tr>
            }
          </tbody>
        </table>
      </div>
    </Card>
  );
}
