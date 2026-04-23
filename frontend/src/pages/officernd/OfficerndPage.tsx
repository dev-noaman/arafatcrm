import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { officerndApi } from "@/api/officernd";
import { Button, Card } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import type { OfficerndSyncItem } from "@/types/officernd";
import {
  RefreshCw,
  Search,
  Send,
  UserPlus,
  EyeOff,
  Eye,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ─── Constants ─── */

type TabStatus = "" | "PENDING" | "ASSIGNED" | "PIPELINED" | "IGNORED";

const TABS: { value: TabStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "PIPELINED", label: "Pipelined" },
  { value: "IGNORED", label: "Ignored" },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  PIPELINED: "bg-green-100 text-green-700",
  IGNORED: "bg-slate-100 text-slate-700",
};

/* ─── Helpers ─── */

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  return rtf.format(-diffDay, "day");
}

function formatCurrency(value: number | null): string {
  if (value == null) return "-";
  return `QAR ${value.toLocaleString()}`;
}

function getEndDateClass(endDate: string): { className: string; badge?: string } {
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return { className: "text-red-600 font-medium", badge: "Expired" };
  if (diffDays < 7) return { className: "text-red-600 font-medium" };
  if (diffDays < 30) return { className: "text-amber-600 font-medium" };
  return { className: "text-gray-700" };
}

function formatDiff(changes: Record<string, { old: any; new: any }>): string {
  return Object.entries(changes)
    .map(([field, { old: oldVal, new: newVal }]) => `${field}: ${JSON.stringify(oldVal)} -> ${JSON.stringify(newVal)}`)
    .join("\n");
}

/* ─── Main Page ─── */

export default function OfficerndPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<TabStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{
    label: string;
    fn: () => void;
  } | null>(null);

  const limit = 20;

  /* ─── Queries ─── */

  const { data: syncStatus } = useQuery({
    queryKey: ["officernd", "sync-status"],
    queryFn: officerndApi.getSyncStatus,
  });

  const { data: expiring, isLoading } = useQuery({
    queryKey: ["officernd", "expiring", page, tab, search],
    queryFn: () =>
      officerndApi.getExpiring({
        page,
        limit,
        ...(tab ? { status: tab } : {}),
        ...(search ? { search } : {}),
      }),
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ["officernd", "sales-reps"],
    queryFn: officerndApi.getSalesReps,
  });

  /* ─── Mutations ─── */

  const syncMutation = useMutation({
    mutationFn: officerndApi.triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd"] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      officerndApi.assign(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd"] });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (id: string) => officerndApi.unassign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd"] });
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: (id: string) => officerndApi.ignore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd"] });
    },
  });

  const unignoreMutation = useMutation({
    mutationFn: (id: string) => officerndApi.unignore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd"] });
    },
  });

  const sendToPipelineMutation = useMutation({
    mutationFn: (id: string) => officerndApi.sendToPipeline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd"] });
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: ({ ids, userId }: { ids: string[]; userId: string }) =>
      officerndApi.bulkAssign(ids, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd"] });
      setSelectedIds(new Set());
    },
  });

  const bulkSendToPipelineMutation = useMutation({
    mutationFn: (ids: string[]) => officerndApi.bulkSendToPipeline(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd"] });
      setSelectedIds(new Set());
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => officerndApi.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officernd"] });
    },
  });

  /* ─── Selection helpers ─── */

  const items = expiring?.data ?? [];
  const totalCount = expiring?.total ?? 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }, [items, selectedIds.size]);

  /* ─── Bulk action logic ─── */

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds],
  );

  const canBulkAssign = useMemo(
    () =>
      selectedItems.length > 0 &&
      selectedItems.every((i) => i.status === "PENDING" || i.status === "IGNORED"),
    [selectedItems],
  );

  const canBulkSendToPipeline = useMemo(
    () =>
      selectedItems.length > 0 &&
      selectedItems.every((i) => i.status === "ASSIGNED"),
    [selectedItems],
  );

  const canBulkIgnore = useMemo(
    () =>
      selectedItems.length > 0 &&
      selectedItems.every((i) => i.status === "PENDING" || i.status === "ASSIGNED"),
    [selectedItems],
  );

  const canBulkUnignore = useMemo(
    () =>
      selectedItems.length > 0 &&
      selectedItems.every((i) => i.status === "IGNORED"),
    [selectedItems],
  );

  /* ─── Bulk action executors ─── */

  const executeBulkAction = useCallback(
    (label: string, count: number, fn: () => void) => {
      if (count > 10) {
        setConfirmAction({ label, fn });
      } else {
        fn();
      }
    },
    [],
  );

  /* ─── Search handler ─── */

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
    setSelectedIds(new Set());
  }, [searchInput]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch],
  );

  /* ─── Tab change ─── */

  const handleTabChange = useCallback((value: TabStatus) => {
    setTab(value);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  /* ─── Summary counts ─── */

  const counts = syncStatus?.counts ?? {};

  /* ─── Inline assign dropdown state ─── */

  const [inlineAssignId, setInlineAssignId] = useState<string | null>(null);

  /* ─── Render ─── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            OfficeRnD Renewals
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Last sync: {formatRelativeTime(syncStatus?.lastSync ?? null)}
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          isLoading={syncMutation.isPending}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Now
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {(
          [
            { key: "PENDING", label: "Pending", color: "bg-gray-50 border-gray-200" },
            { key: "ASSIGNED", label: "Assigned", color: "bg-blue-50 border-blue-200" },
            { key: "PIPELINED", label: "Pipelined", color: "bg-green-50 border-green-200" },
            { key: "IGNORED", label: "Ignored", color: "bg-slate-50 border-slate-200" },
          ] as const
        ).map((card) => (
          <div
            key={card.key}
            className={`rounded-lg border p-4 ${card.color}`}
          >
            <p className="text-sm font-medium text-gray-600">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {counts[card.key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTabChange(t.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
                tab === t.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search company, email, phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} selected
          </span>

          {/* Bulk Assign */}
          <div className="flex items-center gap-2">
            <select
              id="bulk-assign-select"
              disabled={!canBulkAssign}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Select sales rep for bulk assign"
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value || !canBulkAssign) return;
                const userId = e.target.value;
                executeBulkAction(
                  `Assign ${selectedIds.size} renewals`,
                  selectedIds.size,
                  () => bulkAssignMutation.mutate({ ids: Array.from(selectedIds), userId }),
                );
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Assign to...
              </option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name || rep.email}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Send to Pipeline */}
          <Button
            variant="secondary"
            size="sm"
            disabled={!canBulkSendToPipeline || bulkSendToPipelineMutation.isPending}
            isLoading={bulkSendToPipelineMutation.isPending && canBulkSendToPipeline}
            onClick={() =>
              executeBulkAction(
                `Send ${selectedIds.size} renewals to pipeline`,
                selectedIds.size,
                () => bulkSendToPipelineMutation.mutate(Array.from(selectedIds)),
              )
            }
          >
            <Send className="h-4 w-4 mr-1" />
            Send to Pipeline
          </Button>

          {/* Bulk Ignore */}
          <Button
            variant="secondary"
            size="sm"
            disabled={!canBulkIgnore}
            onClick={() => {
              Array.from(selectedIds).forEach((id) => ignoreMutation.mutate(id));
              setSelectedIds(new Set());
            }}
          >
            <EyeOff className="h-4 w-4 mr-1" />
            Ignore
          </Button>

          {/* Bulk Unignore */}
          <Button
            variant="secondary"
            size="sm"
            disabled={!canBulkUnignore}
            onClick={() => {
              Array.from(selectedIds).forEach((id) => unignoreMutation.mutate(id));
              setSelectedIds(new Set());
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            Unignore
          </Button>

          <span className="text-xs text-gray-500 ml-auto">
            {!canBulkAssign && !canBulkSendToPipeline && !canBulkIgnore && !canBulkUnignore && selectedItems.length > 0
              ? "Mixed statuses - select items of the same status"
              : ""}
          </span>
        </div>
      )}

      {/* Data Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No renewals found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membership</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Upstream</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                    salesReps={salesReps}
                    inlineAssignId={inlineAssignId}
                    onSetInlineAssignId={setInlineAssignId}
                    onAssign={(id, userId) => assignMutation.mutate({ id, userId })}
                    onUnassign={(id) => unassignMutation.mutate(id)}
                    onIgnore={(id) => ignoreMutation.mutate(id)}
                    onUnignore={(id) => unignoreMutation.mutate(id)}
                    onSendToPipeline={(id) => sendToPipelineMutation.mutate(id)}
                    onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                    assignPending={assignMutation.isPending}
                    sendPending={sendToPipelineMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, totalCount)} of {totalCount} renewals
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * limit >= totalCount}
                onClick={() => setPage(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Sales Reps Notice */}
      {salesReps.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-800">
            No sales reps available.{" "}
            <a href="/users" className="underline font-medium hover:text-amber-900">
              Create a SALES user
            </a>{" "}
            to enable assignment.
          </div>
        </div>
      )}

      {/* Confirm Modal for bulk actions > 10 */}
      {confirmAction && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          title="Confirm Action"
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-700">{confirmAction.label}?</p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  confirmAction.fn();
                  setConfirmAction(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Row Component ─── */

interface RowProps {
  item: OfficerndSyncItem;
  selected: boolean;
  onToggle: () => void;
  salesReps: { id: string; name: string | null; email: string }[];
  inlineAssignId: string | null;
  onSetInlineAssignId: (id: string | null) => void;
  onAssign: (id: string, userId: string) => void;
  onUnassign: (id: string) => void;
  onIgnore: (id: string) => void;
  onUnignore: (id: string) => void;
  onSendToPipeline: (id: string) => void;
  onAcknowledge: (id: string) => void;
  assignPending: boolean;
  sendPending: boolean;
}

function Row({
  item,
  selected,
  onToggle,
  salesReps,
  inlineAssignId,
  onSetInlineAssignId,
  onAssign,
  onUnassign,
  onIgnore,
  onUnignore,
  onSendToPipeline,
  onAcknowledge,
  assignPending,
  sendPending,
}: RowProps) {
  const endDisplay = getEndDateClass(item.endDate);

  const handleInlineAssign = (userId: string) => {
    onAssign(item.id, userId);
    onSetInlineAssignId(null);
  };

  return (
    <tr className={selected ? "bg-blue-50" : "hover:bg-gray-50"}>
      {/* Checkbox */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="rounded border-gray-300"
          aria-label={`Select ${item.companyName}`}
        />
      </td>

      {/* Company */}
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-gray-900">
            {item.companyName}
          </div>
          <div className="text-xs text-gray-500">
            {item.membershipType || "Unknown"}
          </div>
          {(item.contactEmail || item.contactPhone) && (
            <div className="text-xs text-gray-500 mt-0.5">
              {item.contactEmail}
              {item.contactEmail && item.contactPhone && " | "}
              {item.contactPhone}
            </div>
          )}
        </div>
      </td>

      {/* Membership */}
      <td className="px-4 py-3 text-sm text-gray-700">
        {formatCurrency(item.membershipValue)}
      </td>

      {/* End Date */}
      <td className="px-4 py-3">
        <div>
          <div className={`text-sm ${endDisplay.className}`}>
            {new Date(item.endDate).toLocaleDateString()}
          </div>
          {endDisplay.badge && (
            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              {endDisplay.badge}
            </span>
          )}
        </div>
      </td>

      {/* Assigned To */}
      <td className="px-4 py-3">
        {inlineAssignId === item.id ? (
          <div className="flex items-center gap-1">
            <select
              autoFocus
              className="rounded border border-gray-300 px-2 py-1 text-sm min-h-[44px]"
              aria-label="Select sales rep"
              defaultValue={item.assignedTo ?? ""}
              onChange={(e) => {
                if (e.target.value) handleInlineAssign(e.target.value);
              }}
              onBlur={() => onSetInlineAssignId(null)}
            >
              <option value="" disabled>
                Select...
              </option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name || rep.email}
                </option>
              ))}
            </select>
            <button
              onClick={() => onSetInlineAssignId(null)}
              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Cancel assign"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : item.assignedUser ? (
          <span className="text-sm text-gray-700">
            {item.assignedUser.name || item.assignedUser.email}
          </span>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )}
      </td>

      {/* Status Badge */}
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] ?? "bg-gray-100 text-gray-700"}`}
        >
          {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
        </span>
      </td>

      {/* Upstream */}
      <td className="px-4 py-3">
        {item.upstreamChangedAt ? (
          <div className="flex items-center gap-2">
            <span className="relative group">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-pre max-w-xs z-10">
                {item.upstreamChanges
                  ? formatDiff(item.upstreamChanges)
                  : "Upstream changes detected"}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAcknowledge(item.id)}
              aria-label="Acknowledge upstream changes"
            >
              Review
            </Button>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {item.status === "PENDING" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetInlineAssignId(item.id)}
                disabled={assignPending}
                aria-label="Assign renewal"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onIgnore(item.id)}
                aria-label="Ignore renewal"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </>
          )}

          {item.status === "ASSIGNED" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSendToPipeline(item.id)}
                disabled={sendPending}
                aria-label="Send to pipeline"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUnassign(item.id)}
                aria-label="Unassign renewal"
              >
                <UserPlus className="h-4 w-4 text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onIgnore(item.id)}
                aria-label="Ignore renewal"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </>
          )}

          {item.status === "PIPELINED" && (
            <span className="text-sm text-green-600 font-medium">
              In Pipeline
            </span>
          )}

          {item.status === "IGNORED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnignore(item.id)}
              aria-label="Unignore renewal"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
