import { useAuthStore } from "@/contexts/auth-store";
import OverallSummarySection from "./OverallSummarySection";
import StaffChartsSection from "./StaffChartsSection";
import LocationSourceSection from "./LocationSourceSection";
import PipelineSection from "./PipelineSection";
import BrokerSection from "./BrokerSection";
import SpaceTypeSection from "./SpaceTypeSection";

export default function ReportsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>

      {isAdmin && <OverallSummarySection />}
      {isAdmin && <StaffChartsSection />}
      <LocationSourceSection />
      <SpaceTypeSection />
      <PipelineSection />
      <BrokerSection />
    </div>
  );
}
