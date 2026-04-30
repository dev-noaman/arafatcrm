import ApexChart from "./ApexChart";
import type { ByTypeRow } from "@/api/officernd-reports";

export const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  OFFICE: "Office",
  VIRTUAL_OFFICE: "Virtual Office",
  TRADE_LICENSE: "Trade License",
  COWORKING: "Coworking",
  OTHERS: "Others",
};

export const MEMBERSHIP_TYPE_COLORS: Record<string, string> = {
  OFFICE: "#3B82F6",
  VIRTUAL_OFFICE: "#8B5CF6",
  TRADE_LICENSE: "#F59E0B",
  COWORKING: "#14B8A6",
  OTHERS: "#9CA3AF",
};

export default function MembershipTypeChart({ data }: { data: ByTypeRow[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-500">No renewals yet</div>;

  return (
    <ApexChart
      type="donut"
      height={350}
      series={data.map((d) => d.count)}
      options={{
        chart: { type: "donut" },
        colors: data.map((d) => MEMBERSHIP_TYPE_COLORS[d.type] || "#9CA3AF"),
        labels: data.map((d) => MEMBERSHIP_TYPE_LABELS[d.type] || d.type),
        dataLabels: { enabled: true, style: { fontSize: "12px", colors: ["#fff"] } },
        legend: { position: "bottom", fontSize: "12px" },
        plotOptions: {
          pie: {
            donut: {
              size: "55%",
              labels: {
                show: true,
                total: {
                  show: true,
                  label: "Total",
                  formatter: () => String(data.reduce((a, b) => a + b.count, 0)),
                },
              },
            },
          },
        },
      }}
    />
  );
}
