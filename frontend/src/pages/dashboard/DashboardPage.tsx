import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard";
import { reportsApi } from "@/api/reports";
import { Card } from "@/components/ui";
import { LocationChart, SourceChart, StaffWinLossChart, StaffWinRateChart } from "@/components/charts";
import { Briefcase, DollarSign, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/contexts/auth-store";
import OfficerndDashboardSection from "./OfficerndDashboardSection";

export default function DashboardPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardApi.getStats(),
  });

  const { data: byLocation, isLoading: locationLoading } = useQuery({
    queryKey: ["dashboard", "byLocation"],
    queryFn: () => dashboardApi.getByLocation(),
  });

  const { data: bySource, isLoading: sourceLoading } = useQuery({
    queryKey: ["dashboard", "bySource"],
    queryFn: () => dashboardApi.getBySource(),
  });

  const { data: winLossData, isLoading: winLossLoading } = useQuery({
    queryKey: ["reports", "win-loss"],
    queryFn: () => reportsApi.getWinLoss(),
  });

  const statCards = [
    { title: "Total Deals", value: stats?.totalDeals ?? 0, icon: Briefcase, color: "text-brand-500", bg: "bg-brand-50" },
    { title: "Won Deals", value: stats?.wonDeals ?? 0, icon: TrendingUp, color: "text-success-600", bg: "bg-success-50" },
    { title: "Lost Deals", value: stats?.lostDeals ?? 0, icon: DollarSign, color: "text-red-500", bg: "bg-red-50" },
    { title: "Revenue (QAR)", value: stats?.revenueQar ?? "0", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Conversion Rate", value: `${stats?.conversionRate ?? 0}%`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-md font-semibold text-gray-800 dark:text-white">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Track your CRM performance at a glance</p>
        </div>
      </div>

      {/* Lead Sources */}
      <div className="space-y-6 border-l-4 border-blue-500 pl-6">
        <div>
          <h2 className="text-title-md font-semibold text-blue-700">Lead Sources</h2>
          <p className="mt-1 text-sm text-gray-500">Organic leads from marketing channels and referrals</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {statCards.map((stat) => (
            <Card key={stat.title} className="p-5">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-xl font-bold text-gray-900">{isLoading ? "-" : stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Location + Source Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Deals by Location">
            {locationLoading ? (
              <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
            ) : (
              <LocationChart data={byLocation ?? []} />
            )}
          </Card>
          <Card title="Deals by Client Source">
            {sourceLoading ? (
              <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
            ) : (
              <SourceChart data={bySource ?? []} />
            )}
          </Card>
        </div>

        {/* Staff Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Staff Win / Loss">
            {winLossLoading ? (
              <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
            ) : (
              <StaffWinLossChart data={winLossData ?? []} />
            )}
          </Card>
          <Card title="Staff Win Rate">
            {winLossLoading ? (
              <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
            ) : (
              <StaffWinRateChart data={winLossData ?? []} />
            )}
          </Card>
        </div>
      </div>

      {isAdmin && <OfficerndDashboardSection />}
    </div>
  );
}
