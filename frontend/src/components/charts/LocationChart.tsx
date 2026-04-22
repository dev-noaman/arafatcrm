import ApexChart from "./ApexChart";
import type { ByLocationReport } from "@/api/dashboard";

interface Props {
  data: ByLocationReport[];
}

const LOCATION_LABELS: Record<string, string> = {
  BARWA_ALSADD: "Barwa Alsadd",
  ELEMENT_WESTBAY: "Element Westbay",
  MARINA50_LUSAIL: "Marina 50 Lusail",
};

export default function LocationChart({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-400">No data available</div>;

  return (
    <ApexChart
      type="bar"
      height={350}
      series={[
        { name: "Won", data: data.map((d) => d.won) },
        { name: "Lost", data: data.map((d) => d.lost) },
      ]}
      options={{
        chart: { type: "bar", stacked: true },
        plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: "60%" } },
        dataLabels: { enabled: false },
        xaxis: {
          categories: data.map((d) => LOCATION_LABELS[d.location] || d.location),
          labels: { style: { fontSize: "12px" } },
        },
        yaxis: { labels: { style: { fontSize: "12px" } } },
        colors: ["#10B981", "#EF4444"],
        legend: { position: "top" },
        tooltip: { y: { formatter: (v: number) => `${v} deals` } },
        grid: { borderColor: "#f1f5f9" },
      }}
    />
  );
}
