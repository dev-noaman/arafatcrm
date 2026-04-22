import apiClient from "@/lib/api-client";

export interface DataSourceItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataSourceDto {
  name: string;
  isActive?: boolean;
}

export interface UpdateDataSourceDto {
  name?: string;
  isActive?: boolean;
}

export const dataSourcesApi = {
  findAll: async (): Promise<DataSourceItem[]> => {
    const response = await apiClient.get("/data-sources");
    return response.data;
  },

  findOne: async (id: string): Promise<DataSourceItem> => {
    const response = await apiClient.get(`/data-sources/${id}`);
    return response.data;
  },

  create: async (dto: CreateDataSourceDto): Promise<DataSourceItem> => {
    const response = await apiClient.post("/data-sources", dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateDataSourceDto): Promise<DataSourceItem> => {
    const response = await apiClient.put(`/data-sources/${id}`, dto);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/data-sources/${id}`);
  },
};
