import apiClient from "@/lib/api-client";
import type { Broker, BrokerDocument, CreateBrokerDto, UpdateBrokerDto } from "@/types/broker";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const brokersApi = {
  findAll: async (page = 1, limit = 20): Promise<PaginatedResponse<Broker>> => {
    const response = await apiClient.get("/brokers", { params: { page, limit } });
    return response.data;
  },

  findOne: async (id: string): Promise<Broker> => {
    const response = await apiClient.get(`/brokers/${id}`);
    return response.data;
  },

  create: async (dto: CreateBrokerDto): Promise<Broker> => {
    const response = await apiClient.post("/brokers", dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateBrokerDto): Promise<Broker> => {
    const response = await apiClient.put(`/brokers/${id}`, dto);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/brokers/${id}`);
  },

  bulkCreate: async (dtos: CreateBrokerDto[]): Promise<{ created: number; errors: { row: number; message: string }[] }> => {
    const response = await apiClient.post("/brokers/bulk", dtos);
    return response.data;
  },

  uploadDocument: async (brokerId: string, file: File, docType: string): Promise<BrokerDocument> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);
    const response = await apiClient.post(`/brokers/${brokerId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  deleteDocument: async (brokerId: string, documentId: string): Promise<void> => {
    await apiClient.delete(`/brokers/${brokerId}/documents/${documentId}`);
  },

  getDocumentUrl: (path: string): string => {
    return `/${path}`;
  },
};
