import apiClient from "@/lib/api-client";

export interface Todo {
  id: string;
  text: string;
  isCompleted: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const todosApi = {
  getAll: async (): Promise<Todo[]> => {
    const response = await apiClient.get("/todos");
    return response.data;
  },

  create: async (text: string): Promise<Todo> => {
    const response = await apiClient.post("/todos", { text });
    return response.data;
  },

  update: async (id: string, data: { text?: string; isCompleted?: boolean }): Promise<Todo> => {
    const response = await apiClient.put(`/todos/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/todos/${id}`);
  },
};
