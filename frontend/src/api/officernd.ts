import apiClient from "../lib/api-client";
import type {
  OfficerndSyncItem,
  OfficerndSyncRun,
  OfficerndSyncStatusResponse,
  PaginatedResponse,
} from "../types/officernd";

export const officerndApi = {
  getSyncStatus: () =>
    apiClient
      .get<OfficerndSyncStatusResponse>("/officernd/sync-status")
      .then((r) => r.data),

  getSyncRuns: (page = 1) =>
    apiClient
      .get<PaginatedResponse<OfficerndSyncRun>>("/officernd/sync-runs", {
        params: { page },
      })
      .then((r) => r.data),

  getExpiring: (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) =>
    apiClient
      .get<PaginatedResponse<OfficerndSyncItem>>("/officernd/expiring", {
        params,
      })
      .then((r) => r.data),

  getSalesReps: () =>
    apiClient
      .get<{ id: string; name: string | null; email: string }[]>(
        "/officernd/sales-reps",
      )
      .then((r) => r.data),

  triggerSync: () =>
    apiClient.post("/officernd/sync").then((r) => r.data),

  assign: (id: string, userId: string) =>
    apiClient
      .patch(`/officernd/${id}/assign`, { userId })
      .then((r) => r.data),

  unassign: (id: string) =>
    apiClient.patch(`/officernd/${id}/unassign`).then((r) => r.data),

  bulkAssign: (ids: string[], userId: string) =>
    apiClient
      .post("/officernd/bulk-assign", { ids, userId })
      .then((r) => r.data),

  sendToPipeline: (id: string) =>
    apiClient
      .post(`/officernd/${id}/send-to-pipeline`)
      .then((r) => r.data),

  bulkSendToPipeline: (ids: string[]) =>
    apiClient
      .post("/officernd/bulk-send-to-pipeline", { ids })
      .then((r) => r.data),

  ignore: (id: string) =>
    apiClient.patch(`/officernd/${id}/ignore`).then((r) => r.data),

  unignore: (id: string) =>
    apiClient.patch(`/officernd/${id}/unignore`).then((r) => r.data),

  acknowledge: (id: string) =>
    apiClient.patch(`/officernd/${id}/acknowledge`).then((r) => r.data),
};
