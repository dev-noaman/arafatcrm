import apiClient from "@/lib/api-client";
import type { Client, CreateClientDto, UpdateClientDto } from "@/types/client";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const clientsApi = {
  findAll: async (page = 1, limit = 20): Promise<PaginatedResponse<Client>> => {
    const response = await apiClient.get("/clients", { params: { page, limit } });
    return response.data;
  },

  findOne: async (id: string): Promise<Client> => {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data;
  },

  create: async (dto: CreateClientDto): Promise<Client> => {
    const response = await apiClient.post("/clients", dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateClientDto): Promise<Client> => {
    const response = await apiClient.put(`/clients/${id}`, dto);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },

  bulkCreate: async (dtos: CreateClientDto[]): Promise<{ created: number; errors: { row: number; message: string }[] }> => {
    const response = await apiClient.post("/clients/bulk", dtos);
    return response.data;
  },
};
