import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard";
import { Card } from "@/components/ui";
import { LocationChart, SourceChart } from "@/components/charts";
import { FileDown } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";

export default function LocationSourceSection() {
  const { data: locationData, isLoading: locationLoading } = useQuery({
    queryKey: ["dashboard", "by-location"],
    queryFn: () => dashboardApi.getByLocation(),
  });

  const { data: sourceData, isLoading: sourceLoading } = useQuery({
    queryKey: ["dashboard", "by-source"],
    queryFn: () => dashboardApi.getBySource(),
  });

  const locationPdf = useExportPdf("Deals-by-Location");
  const sourcePdf = useExportPdf("Deals-by-Client-Source");

  const pdfBtn = (fn: () => void) => (
    <button onClick={fn} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
      <FileDown className="h-3.5 w-3.5" /> PDF
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Deals by Location" action={pdfBtn(locationPdf.exportPdf)}>
        <div ref={locationPdf.ref}>
          {locationLoading ? (
            <div className="flex items-center justify-center h-[350px] text-gray-400">Loading...</div>
          ) : (
            <LocationChart data={locationData ?? []} />
          )}
        </div>
      </Card>
      <Card title="Deals by Client Source" action={pdfBtn(sourcePdf.exportPdf)}>
        <div ref={sourcePdf.ref}>
          {sourceLoading ? (
            <div className="flex items-center justify-center h-[350px] text-gray-400">Loading...</div>
          ) : (
            <SourceChart data={sourceData ?? []} />
          )}
        </div>
      </Card>
    </div>
  );
}
