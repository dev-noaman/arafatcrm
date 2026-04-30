import apiClient from "@/lib/api-client";
import type { OfficerndMembershipType } from "@arafat/shared";

export interface LifecycleSummary {
  pending: number;
  assigned: number;
  pipelined: number;
  ignored: number;
}

export interface ByTypeRow {
  type: OfficerndMembershipType;
  count: number;
}

export interface AssignedByStaffRow {
  userId: string;
  userName: string;
  count: number;
}

export interface DashboardWinLoss {
  won: number;
  lost: number;
  active: number;
  winRate: number;
}

export interface ReportStaffSummaryRow {
  userId: string;
  userName: string;
  assigned: number;
  pipelined: number;
  won: number;
  lost: number;
  winRate: number;
}

export interface ReportWinLossRow {
  userId: string;
  userName: string;
  won: number;
  lost: number;
  winRate: number;
}

export const officerndReportsApi = {
  getLifecycleSummary: async (): Promise<LifecycleSummary> =>
    (await apiClient.get("/dashboard/officernd/lifecycle-summary")).data,

  getByType: async (): Promise<ByTypeRow[]> =>
    (await apiClient.get("/dashboard/officernd/by-type")).data,

  getAssignedByStaff: async (): Promise<AssignedByStaffRow[]> =>
    (await apiClient.get("/dashboard/officernd/assigned-by-staff")).data,

  getDashboardWinLoss: async (): Promise<DashboardWinLoss> =>
    (await apiClient.get("/dashboard/officernd/win-loss")).data,

  getReportStaffSummary: async (month?: string): Promise<ReportStaffSummaryRow[]> =>
    (await apiClient.get("/reports/officernd/staff-summary", { params: month ? { month } : {} })).data,

  getReportTypeSummary: async (month?: string): Promise<ByTypeRow[]> =>
    (await apiClient.get("/reports/officernd/type-summary", { params: month ? { month } : {} })).data,

  getReportWinLoss: async (month?: string): Promise<ReportWinLossRow[]> =>
    (await apiClient.get("/reports/officernd/win-loss", { params: month ? { month } : {} })).data,
};
