import ApexChart from "./ApexChart";
import type { ReportWinLossRow } from "@/api/officernd-reports";

export default function OfficerndWinLossChart({ data }: { data: ReportWinLossRow[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-500">No data</div>;

  return (
    <>
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
          // Pattern fill on the "Lost" bars so deuteranopic / protanopic users can
          // still distinguish series without relying on the red/green hue alone.
          fill: {
            type: ["solid", "pattern"],
            pattern: { style: "slantedLines", strokeWidth: 2, width: 6, height: 6 },
          },
          dataLabels: { enabled: true, style: { colors: ["#fff"], fontSize: "11px" } },
          legend: { position: "top" },
        }}
      />
      {/* sr-only table fallback for screen readers — bar charts in SVG are opaque to AT. */}
      <table className="sr-only" aria-label="Per-staff win/loss for OfficeRnD deals">
        <thead>
          <tr><th>Staff</th><th>Won</th><th>Lost</th><th>Win rate</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.userId}>
              <td>{d.userName}</td>
              <td>{d.won}</td>
              <td>{d.lost}</td>
              <td>{d.winRate.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
