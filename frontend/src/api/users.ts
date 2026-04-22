import apiClient from "@/lib/api-client";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "SALES";
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
  role?: "ADMIN" | "SALES";
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  role?: "ADMIN" | "SALES";
}

export const usersApi = {
  findAll: async (): Promise<User[]> => {
    const response = await apiClient.get("/users");
    return response.data;
  },

  findOne: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  create: async (dto: CreateUserDto): Promise<User> => {
    const response = await apiClient.post("/users", dto);
    return response.data;
  },

  bulkCreate: async (users: CreateUserDto[]): Promise<{ created: number; errors: string[] }> => {
    const response = await apiClient.post("/users/bulk", { users });
    return response.data;
  },

  update: async (id: string, dto: UpdateUserDto): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, dto);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
