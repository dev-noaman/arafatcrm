import apiClient from "@/lib/api-client";

export const calendarApi = {
  getConnectUrl: () =>
    apiClient.get<{ url: string }>("/calendar/connect").then((r) => r.data),

  getStatus: () =>
    apiClient
      .get<{ connected: boolean }>("/calendar/status")
      .then((r) => r.data),

  disconnect: () =>
    apiClient.delete("/calendar/connect").then((r) => r.data),

  getBookingTypes: () =>
    apiClient
      .get<{ id: string; name: string; slug: string }[]>("/calendar/booking-types")
      .then((r) => r.data),

  setDefaultBookingType: (bookingTypeId: string) =>
    apiClient
      .put("/calendar/default-booking-type", { bookingTypeId })
      .then((r) => r.data),

  generateBookingLink: (dealId: string) =>
    apiClient
      .post<{ url: string }>("/calendar/booking-link", { dealId })
      .then((r) => r.data),
};
