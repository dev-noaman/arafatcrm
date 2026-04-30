import ApexChart from "./ApexChart";
import type { AssignedByStaffRow } from "@/api/officernd-reports";

export default function OfficerndAssignedByStaffChart({ data }: { data: AssignedByStaffRow[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-500">No data</div>;

  return (
    <ApexChart
      type="bar"
      height={350}
      series={[{ name: "Assigned", data: data.map((d) => d.count) }]}
      options={{
        chart: { type: "bar", toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        xaxis: { categories: data.map((d) => d.userName) },
        colors: ["#A855F7"],
        dataLabels: { enabled: true, style: { colors: ["#fff"], fontSize: "11px" } },
      }}
    />
  );
}
