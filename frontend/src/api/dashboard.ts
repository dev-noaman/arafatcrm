import apiClient from "@/lib/api-client";

export interface DashboardStats {
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  revenueQar: string;
  conversionRate: number;
}

export interface RevenueTimeseriesPoint {
  bucket: string;
  revenueQar: string;
  wonCount: number;
}

export interface ByLocationReport {
  location: string;
  won: number;
  lost: number;
}

export interface BySourceReport {
  source: string;
  won: number;
  lost: number;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get("/dashboard/stats");
    return response.data;
  },

  getRevenueTimeseries: async (days = 30): Promise<RevenueTimeseriesPoint[]> => {
    const response = await apiClient.get("/dashboard/revenue-timeseries", { params: { days } });
    return response.data;
  },

  getByLocation: async (): Promise<ByLocationReport[]> => {
    const response = await apiClient.get("/dashboard/by-location");
    return response.data;
  },

  getBySource: async (): Promise<BySourceReport[]> => {
    const response = await apiClient.get("/dashboard/by-source");
    return response.data;
  },
};
