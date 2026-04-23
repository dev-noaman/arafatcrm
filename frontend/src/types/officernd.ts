export interface OfficerndSyncItem {
  id: string;
  officerndCompanyId: string;
  companyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  membershipId: string;
  membershipType: string | null;
  membershipValue: number | null;
  endDate: string;
  status: "PENDING" | "ASSIGNED" | "PIPELINED" | "IGNORED";
  assignedTo: string | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
  clientId: string | null;
  dealId: string | null;
  upstreamChanges: Record<string, { old: any; new: any }> | null;
  upstreamChangedAt: string | null;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficerndSyncRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
  recordsProcessed: number | null;
  recordsCreated: number | null;
  recordsUpdated: number | null;
  errorMessage: string | null;
  trigger: "CRON" | "MANUAL";
}

export interface OfficerndSyncStatusResponse {
  lastSync: string | null;
  counts: Record<string, number>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
