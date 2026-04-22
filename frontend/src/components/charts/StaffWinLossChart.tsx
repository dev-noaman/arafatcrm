import ApexChart from "./ApexChart";
import type { WinLossReport } from "@/api/reports";

interface Props {
  data: WinLossReport[];
}

export default function StaffWinLossChart({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-400">No data available</div>;

  return (
    <ApexChart
      type="bar"
      height={350}
      series={[
        { name: "Won Value (QAR)", data: data.map((d) => d.wonValue) },
        { name: "Lost Value (QAR)", data: data.map((d) => d.lostValue) },
      ]}
      options={{
        chart: { type: "bar", stacked: false },
        plotOptions: { bar: { borderRadius: 4, columnWidth: "60%" } },
        dataLabels: { enabled: false },
        xaxis: {
          categories: data.map((d) => d.userName || "User"),
          labels: { style: { fontSize: "12px" } },
        },
        yaxis: {
          labels: {
            style: { fontSize: "12px" },
            formatter: (v: number) => `QAR ${(v / 1000).toFixed(0)}K`,
          },
        },
        colors: ["#10B981", "#EF4444"],
        legend: { position: "top" },
        tooltip: {
          y: {
            formatter: (v: number) => `QAR ${v.toLocaleString()}`,
          },
        },
        grid: { borderColor: "#f1f5f9" },
      }}
    />
  );
}
