import ApexChart from "./ApexChart";
import type { PipelineStageReport } from "@/api/reports";

interface Props {
  data: PipelineStageReport[];
}

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  NEW: "New",
  QUALIFIED: "Qualified",
  MEETING: "Meeting",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CONTRACT: "Contract",
  WON: "Won",
  LOST: "Lost",
};

export default function PipelineChart({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-[300px] text-gray-500">No data available</div>;

  return (
    <ApexChart
      type="bar"
      height={300}
      series={[{ name: "Deals", data: data.map((d) => d.count) }]}
      options={{
        chart: { type: "bar" },
        plotOptions: {
          bar: { borderRadius: 4, horizontal: true, barHeight: "60%" },
        },
        dataLabels: { enabled: true, style: { fontSize: "12px" } },
        xaxis: {
          categories: data.map((d) => STAGE_LABELS[d.stage] || d.stage),
          labels: { style: { fontSize: "12px" } },
        },
        yaxis: { labels: { style: { fontSize: "12px" } } },
        colors: ["#465FFF"],
        legend: { show: false },
        tooltip: {
          y: {
            formatter: (v: number, opts?: { dataPointIndex?: number }) => {
              const val = data[opts?.dataPointIndex ?? 0]?.totalValue;
              return val != null ? `${v} deals — QAR ${val.toLocaleString()}` : `${v} deals`;
            },
          },
        },
        grid: { borderColor: "#f1f5f9" },
      }}
    />
  );
}
