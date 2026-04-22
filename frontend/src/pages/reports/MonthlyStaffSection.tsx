import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/reports";
import { Card } from "@/components/ui";
import { Users } from "lucide-react";

export default function MonthlyStaffSection() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <Card title="Monthly Staff Performance" description="Filter by month to see staff activity">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Month</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
        />
      </div>
      <MonthlyTable month={month} />
    </Card>
  );
}

function MonthlyTable({ month }: { month: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "staff-performance", month],
    queryFn: () => reportsApi.getStaffPerformance(month),
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Won</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
          {isLoading ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
          ) : data?.length ? (
            data.map((row) => (
              <tr key={row.userId}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.userName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{row.totalAssigned}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">{row.won}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{row.lost}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">{row.active}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    row.winRate >= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {row.winRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-emerald-600">
                  QAR {row.totalRevenue.toLocaleString()}
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No data for this month</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
