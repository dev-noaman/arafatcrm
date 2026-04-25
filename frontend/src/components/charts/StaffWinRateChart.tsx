import ApexChart from "./ApexChart";
import type { WinLossReport } from "@/api/reports";

interface Props {
  data: WinLossReport[];
}

export default function StaffWinRateChart({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-500">No data available</div>;

  return (
    <ApexChart
      type="radialBar"
      height={350}
      series={data.map((d) => Math.round(d.winRate))}
      options={{
        chart: { type: "radialBar" },
        plotOptions: {
          radialBar: {
            hollow: { size: "35%" },
            dataLabels: {
              name: { fontSize: "13px" },
              value: { fontSize: "16px", fontWeight: 600, formatter: (v: number) => `${v}%` },
              total: {
                show: true,
                label: "Average",
                formatter: () => {
                  const avg = data.reduce((s, d) => s + d.winRate, 0) / data.length;
                  return `${avg.toFixed(1)}%`;
                },
              },
            },
          },
        },
        labels: data.map((d) => d.userName || "User"),
        colors: data.map((d) => (d.winRate >= 50 ? "#10B981" : "#EF4444")),
        legend: { position: "bottom", fontSize: "13px" },
      }}
    />
  );
}
