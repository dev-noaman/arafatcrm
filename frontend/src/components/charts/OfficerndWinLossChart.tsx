import ApexChart from "./ApexChart";
import type { ReportWinLossRow } from "@/api/officernd-reports";

export default function OfficerndWinLossChart({ data }: { data: ReportWinLossRow[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-500">No data</div>;

  return (
    <ApexChart
      type="bar"
      height={350}
      series={[
        { name: "Won", data: data.map((d) => d.won) },
        { name: "Lost", data: data.map((d) => d.lost) },
      ]}
      options={{
        chart: { type: "bar", stacked: false, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 4 } },
        xaxis: { categories: data.map((d) => d.userName) },
        colors: ["#22C55E", "#EF4444"],
        dataLabels: { enabled: true, style: { colors: ["#fff"], fontSize: "11px" } },
        legend: { position: "top" },
      }}
    />
  );
}
