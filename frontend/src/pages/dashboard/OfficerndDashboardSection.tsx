import { useQuery } from "@tanstack/react-query";
import { officerndReportsApi } from "@/api/officernd-reports";
import { Card } from "@/components/ui";
import {
  MembershipTypeChart,
  OfficerndAssignedByStaffChart,
} from "@/components/charts";
import { Building2, UserCheck, ArrowRight, EyeOff, Trophy, X, Activity } from "lucide-react";

export default function OfficerndDashboardSection() {
  const lifecycle = useQuery({
    queryKey: ["dashboard", "officernd", "lifecycle"],
    queryFn: () => officerndReportsApi.getLifecycleSummary(),
  });
  const byType = useQuery({
    queryKey: ["dashboard", "officernd", "byType"],
    queryFn: () => officerndReportsApi.getByType(),
  });
  const assigned = useQuery({
    queryKey: ["dashboard", "officernd", "assigned"],
    queryFn: () => officerndReportsApi.getAssignedByStaff(),
  });
  const winLoss = useQuery({
    queryKey: ["dashboard", "officernd", "winLoss"],
    queryFn: () => officerndReportsApi.getDashboardWinLoss(),
  });

  const lifecycleCards = [
    { title: "Pending", value: lifecycle.data?.pending ?? 0, icon: Building2, color: "text-gray-600", bg: "bg-gray-50" },
    { title: "Assigned", value: lifecycle.data?.assigned ?? 0, icon: UserCheck, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Pipelined", value: lifecycle.data?.pipelined ?? 0, icon: ArrowRight, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Ignored", value: lifecycle.data?.ignored ?? 0, icon: EyeOff, color: "text-gray-400", bg: "bg-gray-50" },
  ];

  const wlCards = [
    { title: "Won", value: winLoss.data?.won ?? 0, icon: Trophy, color: "text-green-600", bg: "bg-green-50" },
    { title: "Lost", value: winLoss.data?.lost ?? 0, icon: X, color: "text-red-600", bg: "bg-red-50" },
    { title: "Active", value: winLoss.data?.active ?? 0, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Win Rate", value: `${winLoss.data?.winRate ?? 0}%`, icon: Trophy, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6 border-l-4 border-purple-500 pl-6">
      <div>
        <h2 className="text-title-md font-semibold text-purple-700">OfficeRnD Renewals</h2>
        <p className="mt-1 text-sm text-gray-500">Membership renewals synced from OfficeRnD</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {lifecycleCards.map((c) => (
          <Card key={c.title} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                <c.icon className={`h-6 w-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{c.title}</p>
                <p className="text-xl font-bold text-gray-900">{lifecycle.isLoading ? "-" : c.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {wlCards.map((c) => (
          <Card key={c.title} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                <c.icon className={`h-6 w-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{c.title}</p>
                <p className="text-xl font-bold text-gray-900">{winLoss.isLoading ? "-" : c.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Membership Type Breakdown">
          {byType.isLoading
            ? <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
            : <MembershipTypeChart data={byType.data ?? []} />
          }
        </Card>
        <Card title="Assigned Per Staff">
          {assigned.isLoading
            ? <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
            : <OfficerndAssignedByStaffChart data={assigned.data ?? []} />
          }
        </Card>
      </div>
    </div>
  );
}
