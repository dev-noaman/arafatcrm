import apiClient from "@/lib/api-client";

export type ReportSource = "leads" | "officernd" | "all";

export interface WinLossReport {
  userId: string;
  userName: string;
  won: number;
  lost: number;
  winRate: number;
  wonValue: number;
  lostValue: number;
  totalValue: number;
}

export interface PipelineStageReport {
  stage: string;
  count: number;
  totalValue: number;
  deals: Array<{
    id: string;
    title: string;
    value: number;
    clientName: string;
    ownerName: string;
    brokerName: string | null;
    location: string | null;
    spaceType: string | null;
  }>;
}

export interface BrokerPerformanceReport {
  brokerId: string;
  brokerName: string;
  totalDeals: number;
  won: number;
  lost: number;
  active: number;
  winRate: number;
  totalValue: number;
  totalCommission: number;
}

export interface StaffPerformanceReport {
  userId: string;
  userName: string;
  totalAssigned: number;
  won: number;
  lost: number;
  active: number;
  wonValue: number;
  lostValue: number;
  activeValue: number;
  winRate: number;
  totalRevenue: number;
  totalCommission: number;
}

export interface SpaceTypeReport {
  spaceType: string;
  count: number;
  totalValue: number;
  won: number;
  lost: number;
}

export const reportsApi = {
  getWinLoss: async (source?: ReportSource): Promise<WinLossReport[]> => {
    const params = source ? { source } : {};
    const response = await apiClient.get("/reports/win-loss", { params });
    return response.data;
  },

  getPipeline: async (): Promise<PipelineStageReport[]> => {
    const response = await apiClient.get("/reports/pipeline");
    return response.data;
  },

  getBrokerPerformance: async (month?: string): Promise<BrokerPerformanceReport[]> => {
    const params = month ? { month } : {};
    const response = await apiClient.get("/reports/broker-performance", { params });
    return response.data;
  },

  getStaffPerformance: async (month?: string, source?: ReportSource): Promise<StaffPerformanceReport[]> => {
    const params: any = {};
    if (month) params.month = month;
    if (source) params.source = source;
    const response = await apiClient.get("/reports/staff-performance", { params });
    return response.data;
  },

  getSpaceTypeBreakdown: async (month?: string): Promise<SpaceTypeReport[]> => {
    const params = month ? { month } : {};
    const response = await apiClient.get("/reports/space-type-breakdown", { params });
    return response.data;
  },
};
