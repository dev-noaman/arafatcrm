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
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    setIsDark(el.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Spread caller options FIRST, then explicitly override merged keys. The previous
  // order (`{ chart: {...defaults, ...options.chart}, ...options }`) silently undid the
  // chart merge because the trailing `...options` would replace `chart` wholesale.
  const { chart: userChart, ...restOptions } = options;
  const mergedOptions: ApexOptions = {
    ...restOptions,
    chart: {
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      background: "transparent",
      // Honour OS-level reduced-motion preference. Disables ApexCharts' default
      // entry animations for users who opt out of motion.
      animations: { enabled: !reduceMotion },
      ...userChart,
    },
    colors: options.colors ?? BRAND_COLORS,
    theme: { mode: isDark ? "dark" : "light" },
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
