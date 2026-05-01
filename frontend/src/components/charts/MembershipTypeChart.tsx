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

  // Sort largest slice first per ApexCharts/data-viz convention. Avoids the donut's
  // legend order being driven by arbitrary backend ordering.
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((a, b) => a + b.count, 0);

  return (
    <>
      <ApexChart
        type="donut"
        height={350}
        series={sorted.map((d) => d.count)}
        options={{
          chart: { type: "donut" },
          colors: sorted.map((d) => MEMBERSHIP_TYPE_COLORS[d.type] || "#9CA3AF"),
          labels: sorted.map((d) => MEMBERSHIP_TYPE_LABELS[d.type] || d.type),
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
                    formatter: () => String(total),
                  },
                },
              },
            },
          },
        }}
      />
      {/* Screen-reader-only data table mirrors the donut. ApexCharts renders the
          donut inside an SVG that's opaque to AT, so we provide an equivalent. */}
      <table className="sr-only" aria-label="Membership type breakdown">
        <thead>
          <tr><th>Type</th><th>Count</th><th>Percent</th></tr>
        </thead>
        <tbody>
          {sorted.map((d) => {
            const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0.0";
            return (
              <tr key={d.type}>
                <td>{MEMBERSHIP_TYPE_LABELS[d.type] || d.type}</td>
                <td>{d.count}</td>
                <td>{pct}%</td>
              </tr>
            );
          })}
          <tr><td>Total</td><td>{total}</td><td>100%</td></tr>
        </tbody>
      </table>
    </>
  );
}
