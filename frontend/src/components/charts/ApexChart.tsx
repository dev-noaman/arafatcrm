import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions, ApexAxisChartSeries, ApexNonAxisChartSeries } from "apexcharts";

const BRAND_COLORS = ["#465FFF", "#10B981", "#F0944D", "#EF4444", "#80CAEE", "#8B5CF6"];

interface ApexChartProps {
  options: ApexOptions;
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  type: "bar" | "radialBar" | "donut" | "pie" | "line" | "area";
  height?: number;
}

export default function ApexChart({ options, series, type, height = 350 }: ApexChartProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    setIsDark(el.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const mergedOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      background: "transparent",
      ...options.chart,
    },
    colors: options.colors ?? BRAND_COLORS,
    theme: { mode: isDark ? "dark" : "light" },
    ...options,
  };

  return (
    <Chart
      options={mergedOptions}
      series={series}
      type={type}
      height={height}
      width="100%"
    />
  );
}
