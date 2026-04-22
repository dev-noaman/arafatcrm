import apiClient from "@/lib/api-client";
import type { Deal, CreateDealDto, UpdateDealDto } from "@/types/deal";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const dealsApi = {
  findAll: async (
    page = 1,
    limit = 20,
    filters?: { status?: string; stage?: string },
  ): Promise<PaginatedResponse<Deal>> => {
    const response = await apiClient.get("/deals", { params: { page, limit, ...filters } });
    return response.data;
  },

  findOne: async (id: string): Promise<Deal> => {
    const response = await apiClient.get(`/deals/${id}`);
    return response.data;
  },

  create: async (dto: CreateDealDto): Promise<Deal> => {
    const response = await apiClient.post("/deals", dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateDealDto): Promise<Deal> => {
    const response = await apiClient.put(`/deals/${id}`, dto);
    return response.data;
  },

  markAsLost: async (id: string, reason: string): Promise<Deal> => {
    const response = await apiClient.post(`/deals/${id}/mark-lost`, { reason });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/deals/${id}`);
  },
};
