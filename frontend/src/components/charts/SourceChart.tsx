import ApexChart from "./ApexChart";
import type { BySourceReport } from "@/api/dashboard";

interface Props {
  data: BySourceReport[];
}

const SOURCE_LABELS: Record<string, string> = {
  MZAD_QATAR: "MZAD Qatar",
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  PROPERTY_FINDER: "Property Finder",
  MAZAD_ARAB: "Mazad Arab",
  REFERRAL: "Referral",
  BROKER: "Broker",
  WEBSITE: "Website",
};

const SOURCE_COLORS: Record<string, string> = {
  MZAD_QATAR: "#EC4899",
  FACEBOOK: "#3B82F6",
  GOOGLE: "#F43F5E",
  INSTAGRAM: "#D946EF",
  TIKTOK: "#14B8A6",
  YOUTUBE: "#F97316",
  PROPERTY_FINDER: "#06B6D4",
  MAZAD_ARAB: "#8B5CF6",
  REFERRAL: "#22C55E",
  BROKER: "#EAB308",
  WEBSITE: "#6366F1",
};

export default function SourceChart({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-500">No data available</div>;

  const totals = data.map((d) => d.won + d.lost);

  return (
    <ApexChart
      type="donut"
      height={350}
      series={totals}
      options={{
        chart: { type: "donut" },
        colors: data.map((d) => SOURCE_COLORS[d.source] || "#6B7280"),
        labels: data.map((d) => SOURCE_LABELS[d.source] || d.source),
        dataLabels: { enabled: true, style: { fontSize: "12px", colors: ["#fff"] }, dropShadow: { enabled: false } },
        plotOptions: {
          pie: {
            donut: {
              size: "55%",
              labels: {
                show: true,
                total: {
                  show: true,
                  label: "Total",
                  formatter: () => String(totals.reduce((a, b) => a + b, 0)),
                },
              },
            },
          },
        },
        legend: { position: "bottom", fontSize: "12px" },
        tooltip: {
          y: {
            formatter: (v: number, opts?: { seriesIndex?: number }) => {
              const i = opts?.seriesIndex ?? 0;
              const d = data[i];
              return d ? `${v} deals (${d.won} won / ${d.lost} lost)` : `${v} deals`;
            },
          },
        },
      }}
    />
  );
}
