import apiClient from "../lib/api-client";
import type { LoginRequest, RegisterRequest, AuthResponse, User } from "@/types/auth";

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  updateProfile: async (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }): Promise<User> => {
    const response = await apiClient.put("/auth/profile", data);
    return response.data;
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/refresh");
    return response.data;
  },

  forgotPassword: async (data: { email: string }): Promise<{ message: string }> => {
    const response = await apiClient.post("/auth/forgot-password", data);
    return response.data;
  },

  resetPassword: async (data: { token: string; password: string }): Promise<{ message: string }> => {
    const response = await apiClient.post("/auth/reset-password", data);
    return response.data;
  },
};
