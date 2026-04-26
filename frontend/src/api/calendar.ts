import apiClient from "@/lib/api-client";

export const calendarApi = {
  getConnectUrl: () =>
    apiClient.get<{ url: string }>("/calendar/connect").then((r) => r.data),

  getStatus: () =>
    apiClient
      .get<{ connected: boolean }>("/calendar/status")
      .then((r) => r.data),
};
