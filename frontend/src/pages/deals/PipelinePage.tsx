import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealsApi } from "@/api/deals";
import { clientsApi } from "@/api/clients";
import { usersApi } from "@/api/users";
import { brokersApi } from "@/api/brokers";
import { calendarApi } from "@/api/calendar";
import { Button, Select, PhoneInput, ClientAutocomplete, Modal } from "@/components/ui";
import { useAuthStore } from "@/contexts/auth-store";
import type { Deal } from "@/types/deal";
import {
  Plus,
  MoreVertical,
  LayoutGrid,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  GripVertical,
  X,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  AlertCircle,
} from "lucide-react";

const PIPELINE_STAGES = [
  { id: "new", label: "New", accent: "#465FFF" },
  { id: "qualified", label: "Qualified", accent: "#7C3AED" },
  { id: "meeting", label: "Meeting", accent: "#A855F7" },
  { id: "proposal", label: "Proposal", accent: "#EC4899" },
  { id: "negotiation", label: "Negotiation", accent: "#F97316" },
  { id: "contract", label: "Contract", accent: "#EAB308" },
  { id: "won", label: "Won", accent: "#22C55E" },
  { id: "lost", label: "Lost", accent: "#EF4444" },
];

function normalizeStage(stage: string): string {
  if (stage === "lead") return "new";
  return stage.toLowerCase();
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `QAR ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `QAR ${(value / 1_000).toFixed(0)}K`;
  return `QAR ${value}`;
}

function DealCard({
  deal,
  stageId,
  onDragStart,
  onClick,
  onWin,
  onLose,
  onScheduleMeeting,
}: {
  deal: Deal;
  stageId: string;
  onDragStart: (id: string) => void;
  onClick: (deal: Deal) => void;
  onWin: (deal: Deal) => void;
  onLose: (deal: Deal) => void;
  onScheduleMeeting: (deal: Deal) => void;
}) {
  const isOfficeRnD = !!deal.officerndSyncId;
  const isTerminal = stageId === "won" || stageId === "lost";

  return (
    <div
      draggable={!isTerminal}
      onDragStart={() => onDragStart(deal.id)}
      onClick={() => onClick(deal)}
      className={`bg-white rounded-lg p-0 ${isTerminal ? "cursor-default" : "cursor-grab active:cursor-grabbing"} hover:shadow-sm transition-all duration-150 group overflow-hidden ${
        isOfficeRnD
          ? "border-2 border-purple-300 hover:border-purple-400"
          : "border border-gray-200 hover:border-[#465FFF]/40"
      }`}
    >
      {isOfficeRnD && (
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-3.5 py-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white tracking-wide uppercase">OfficeRnD Renewal</span>
          {deal.expectedCloseDate && (
            <span className="text-[11px] font-medium text-purple-100">
              by {new Date(deal.expectedCloseDate).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
      <div className="p-3.5">
        <div className="flex items-start gap-2 mb-2">
          {!isTerminal && (
            <GripVertical className="h-4 w-4 text-gray-300 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-sm truncate leading-tight">
              {deal.client?.name || "Unknown"}
            </h4>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {deal.client?.company || "N/A"}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {{ CLOSED_OFFICE: "Closed Office", ABC_ADDRESS: "Abc Address", ABC_FLEX: "Abc Flex", ABC_ELITE: "Abc Elite", WORKSTATION: "Workstation", OFFICE: "Office" }[deal.spaceType] || deal.spaceType}
              {deal.location && ` · ${deal.location.replace(/_/g, " ")}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2.5 pl-6">
          <span className="text-sm font-bold text-gray-900">
            QAR {deal.value.toLocaleString()}
          </span>
          <div className="flex items-center gap-1.5">
            {deal.owner && (
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: "#465FFF" }}
                title={deal.owner.name || deal.owner.email}
              >
                {(deal.owner.name || deal.owner.email).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {!isOfficeRnD && deal.expectedCloseDate && (
          <div className="pl-6 mt-2">
            <span className="text-[11px] text-gray-500">
              Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="pl-6 mt-2 flex items-center gap-3 text-[11px] text-gray-500">
          {deal.broker && (
            <span>Broker: {deal.broker.name}</span>
          )}
          {!deal.broker && (
            <span>Broker: N/A</span>
          )}
        </div>

        {stageId === "won" && (
          <div className="mt-1 pl-6 text-xs font-semibold text-green-700">
            QAR {deal.value?.toLocaleString()}
          </div>
        )}

        {stageId === "lost" && (
          <div className="mt-1 pl-6">
            <div className="text-xs font-semibold text-red-700">
              QAR {deal.value?.toLocaleString()}
            </div>
            {deal.lossReason && (
              <div className="text-xs text-gray-500 mt-0.5 truncate" title={deal.lossReason}>
                {deal.lossReason}
              </div>
            )}
          </div>
        )}

        {stageId === "contract" && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onWin(deal); }}
              className="flex-1 text-xs font-semibold py-1.5 rounded bg-green-500 text-white hover:bg-green-600 min-h-[44px]"
              aria-label="Mark as Won"
            >
              WIN
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onLose(deal); }}
              className="flex-1 text-xs font-semibold py-1.5 rounded bg-red-500 text-white hover:bg-red-600 min-h-[44px]"
              aria-label="Mark as Lost"
            >
              LOSS
            </button>
          </div>
        )}

        {stageId === "meeting" && (
          <button
            onClick={(e) => { e.stopPropagation(); onScheduleMeeting(deal); }}
            className="mt-2 w-full text-xs font-medium py-1.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center justify-center gap-1 min-h-[44px]"
            aria-label={deal.meetingDate ? "Reschedule meeting" : "Schedule meeting"}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            {deal.meetingDate ? "Reschedule" : "Schedule Meeting"}
          </button>
        )}
        {stageId === "meeting" && deal.meetingDate && (
          <div className="mt-1 text-xs text-gray-500">
            {deal.meetingDate} at {deal.meetingTime} — {deal.meetingLocation}
          </div>
        )}
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  isLoading,
  onDrop,
  onDragStart,
  onAddDeal,
  onDealClick,
  onWin,
  onLose,
  onScheduleMeeting,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  deals: Deal[];
  isLoading: boolean;
  onDrop: (stage: string) => void;
  onDragStart: (id: string) => void;
  onAddDeal: (stage: string) => void;
  onDealClick: (deal: Deal) => void;
  onWin: (deal: Deal) => void;
  onLose: (deal: Deal) => void;
  onScheduleMeeting: (deal: Deal) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const total = deals.reduce((sum, d) => sum + d.value, 0);
  const isTerminal = stage.id === "won" || stage.id === "lost";
  const columnBg = stage.id === "won" ? "bg-green-50" : stage.id === "lost" ? "bg-red-50" : "bg-white/60";

  return (
    <div
      className={`flex-1 min-w-0 flex flex-col rounded-xl ${columnBg} p-3 transition-colors duration-150 ${
        isOver ? "bg-[#465FFF]/5" : ""
      }`}
      onDragOver={(e) => {
        if (isTerminal) return;
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        if (isTerminal) return;
        e.preventDefault();
        setIsOver(false);
        onDrop(stage.id);
      }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: stage.accent }}
          />
          <h3 className="font-semibold text-gray-800 text-sm">{stage.label}</h3>
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#465FFF] text-white text-[11px] font-bold">
            {deals.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onAddDeal(stage.id)}
            className="p-1.5 rounded-md text-gray-400 hover:text-[#465FFF] hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Add deal"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300" aria-label="Deal options">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Column Value */}
      {deals.length > 0 && (
        <div className="px-1 mb-3">
          <span className="text-[11px] font-medium text-gray-500">
            {formatCompact(total)}
          </span>
        </div>
      )}

      {/* Deal Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 border-2 border-[#465FFF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deals.length > 0 ? (
          deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} stageId={stage.id} onDragStart={onDragStart} onClick={onDealClick} onWin={onWin} onLose={onLose} onScheduleMeeting={onScheduleMeeting} />
          ))
        ) : (
          <button
            onClick={() => onAddDeal(stage.id)}
            className="w-full py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-xs hover:border-[#465FFF]/30 hover:text-[#465FFF] transition-colors"
          >
            <Plus className="h-5 w-5 mx-auto mb-1" />
            Add deal
          </button>
        )}
      </div>
    </div>
  );
}

function CreateDealModal({
  clients,
  users,
  onClose,
}: {
  clients: any[];
  users: any[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "ADMIN";
  const [formData, setFormData] = useState({
    value: "",
    location: "BARWA_ALSADD",
    spaceType: "CLOSED_OFFICE",
    clientId: "",
    phone: "",
    ownerId: "",
    description: "",
  });
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", company: "", source: "" });
  const [error, setError] = useState("");

  const SOURCES = [
    { value: "", label: "Select Source" },
    { value: "MZAD_QATAR", label: "Mzad Qatar" },
    { value: "FACEBOOK", label: "Facebook" },
    { value: "GOOGLE", label: "Google" },
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "TIKTOK", label: "Tiktok" },
    { value: "YOUTUBE", label: "Youtube" },
    { value: "PROPERTY_FINDER", label: "Property Finder" },
    { value: "MAZAD_ARAB", label: "Mazad Arab" },
    { value: "REFERRAL", label: "Referral" },
    { value: "WEBSITE", label: "Website" },
  ];

  const createMutation = useMutation({
    mutationFn: async (dto: any) => {
      let clientId = dto.clientId;
      if (!clientId) {
        const client = await clientsApi.create({ name: dto.clientName, email: dto.clientEmail, phone: dto.clientPhone || undefined, source: dto.clientSource || undefined });
        clientId = client.id;
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
      return dealsApi.create({
        title: dto.title,
        value: dto.value,
        location: dto.location,
        spaceType: dto.spaceType,
        clientId,
        phone: dto.phone || undefined,
        ownerId: dto.ownerId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onClose();
    },
    onError: (e: any) => {
      setError(e.response?.data?.message || "Failed to create deal");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showNewClient) {
      if (!newClient.name || !newClient.email) {
        setError("Client name and email are required");
        return;
      }
      createMutation.mutate({
        title: newClient.name,
        value: parseFloat(formData.value),
        location: formData.location,
        spaceType: formData.spaceType,
        clientName: newClient.name,
        clientEmail: newClient.email,
        clientPhone: newClient.phone || undefined,
        clientSource: newClient.source || undefined,
        phone: formData.phone || undefined,
        ownerId: isAdmin && formData.ownerId ? formData.ownerId : undefined,
      });
    } else {
      const selectedClient = clients.find((c: any) => c.id === formData.clientId);
      createMutation.mutate({
        title: selectedClient?.name || "New Deal",
        value: parseFloat(formData.value),
        location: formData.location,
        spaceType: formData.spaceType,
        clientId: formData.clientId,
        phone: formData.phone || undefined,
        ownerId: isAdmin && formData.ownerId ? formData.ownerId : undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">Add New Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!showNewClient ? (
            <ClientAutocomplete
              clients={clients}
              value={formData.clientId}
              onChange={(id) => setFormData({ ...formData, clientId: id })}
              onNewClient={() => { setShowNewClient(true); setFormData({ ...formData, clientId: "" }); }}
              label="Client"
              required
            />
          ) : (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">New Client</p>
                <button type="button" onClick={() => setShowNewClient(false)} className="text-xs text-gray-500 hover:text-gray-700">Use existing</button>
              </div>
              <Input label="Name" value={newClient.name} onChange={(e: any) => setNewClient({ ...newClient, name: e.target.value })} required />
              <Input label="Email" type="email" value={newClient.email} onChange={(e: any) => setNewClient({ ...newClient, email: e.target.value })} required />
              <PhoneInput label="Phone" value={newClient.phone} onChange={(val) => setNewClient({ ...newClient, phone: val })} />
              <Input label="Company" value={newClient.company} onChange={(e: any) => setNewClient({ ...newClient, company: e.target.value })} />
              <Select
                label="Source"
                value={newClient.source}
                onChange={(e: any) => setNewClient({ ...newClient, source: e.target.value })}
                options={SOURCES}
              />
            </div>
          )}
          <Input label="Value (QAR)" type="number" value={formData.value} onChange={(e: any) => setFormData({ ...formData, value: e.target.value })} required />
          <PhoneInput label="Deal Phone" value={formData.phone} onChange={(val) => setFormData({ ...formData, phone: val })} maxDigits={6} />
          <Select
            label="Location"
            value={formData.location}
            onChange={(e: any) => setFormData({ ...formData, location: e.target.value })}
            options={[
              { value: "BARWA_ALSADD", label: "Barwa Al Sadd" },
              { value: "ELEMENT_WESTBAY", label: "Element Westbay" },
              { value: "MARINA50_LUSAIL", label: "Marina 50 Lusail" },
            ]}
          />
          <Select
            label="Space Type"
            value={formData.spaceType}
            onChange={(e: any) => setFormData({ ...formData, spaceType: e.target.value })}
            options={[
              { value: "CLOSED_OFFICE", label: "Closed Office" },
              { value: "ABC_ADDRESS", label: "Abc Address" },
              { value: "ABC_FLEX", label: "Abc Flex" },
              { value: "ABC_ELITE", label: "Abc Elite" },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Add deal description..."
              value={formData.description || ""}
              onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          {isAdmin && (
            <Select
              label="Assign To"
              value={formData.ownerId}
              onChange={(e: any) => setFormData({ ...formData, ownerId: e.target.value })}
              options={[{ value: "", label: "Myself" }, ...users.map((u: any) => ({ value: u.id, label: u.name || u.email }))]}
            />
          )}
          {error && <div className="text-sm text-red-600">{String(error)}</div>}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>Create Deal</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DealDetailModal({ deal, onClose, brokers, users }: { deal: Deal; onClose: () => void; brokers: any[]; users: any[] }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "ADMIN";
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: deal.title || "",
    value: String(deal.value),
    stage: normalizeStage(deal.stage),
    phone: deal.phone || "",
    location: deal.location,
    spaceType: deal.spaceType,
    brokerId: (deal as any).brokerId || deal.broker?.id || "",
    ownerId: deal.owner?.id || "",
    expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : "",
    description: deal.description || "",
  });
  const [error, setError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (dto: any) => dealsApi.update(deal.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsEditing(false);
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => dealsApi.delete(deal.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onClose();
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newStage = editData.stage.toUpperCase();
    const isTerminal = newStage === "WON" || newStage === "LOST";
    if (isTerminal && !confirm(`Mark this deal as ${newStage}?`)) return;
    updateMutation.mutate({
      title: editData.title || undefined,
      value: parseFloat(editData.value),
      stage: newStage,
      phone: editData.phone || null,
      location: editData.location,
      spaceType: editData.spaceType,
      brokerId: editData.brokerId || null,
      ownerId: editData.ownerId || undefined,
      expectedCloseDate: editData.expectedCloseDate || null,
      description: editData.description || null,
      ...(isTerminal ? { confirmTerminal: true } : {}),
    });
  };

  const locationLabels: Record<string, string> = {
    BARWA_ALSADD: "Barwa Al Sadd",
    ELEMENT_WESTBAY: "Element Westbay",
    MARINA50_LUSAIL: "Marina 50 Lusail",
  };
  const spaceLabels: Record<string, string> = { CLOSED_OFFICE: "Closed Office", ABC_ADDRESS: "Abc Address", ABC_FLEX: "Abc Flex", ABC_ELITE: "Abc Elite", WORKSTATION: "Workstation", OFFICE: "Office" };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">{isEditing ? "Edit Deal" : deal.client?.name || deal.title}</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300" aria-label="Edit deal">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => { if (confirm("Delete this deal?")) deleteMutation.mutate(); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300" aria-label="Delete deal">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <Input label="Title" value={editData.title} onChange={(e: any) => setEditData({ ...editData, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Value (QAR)" type="number" value={editData.value} onChange={(e: any) => setEditData({ ...editData, value: e.target.value })} required />
              <Select
                label="Stage"
                value={editData.stage}
                onChange={(e: any) => setEditData({ ...editData, stage: e.target.value })}
                options={PIPELINE_STAGES.map((s) => ({ value: s.id, label: s.label }))}
              />
              <Input label="Phone" value={editData.phone} onChange={(e: any) => setEditData({ ...editData, phone: e.target.value })} />
              <Select
                label="Broker"
                value={editData.brokerId}
                onChange={(e: any) => setEditData({ ...editData, brokerId: e.target.value })}
                options={[{ value: "", label: "None" }, ...brokers.map((b: any) => ({ value: b.id, label: b.name || b.email }))]}
              />
              <Select
                label="Location"
                value={editData.location}
                onChange={(e: any) => setEditData({ ...editData, location: e.target.value })}
                options={Object.entries(locationLabels).map(([v, l]) => ({ value: v, label: l }))}
              />
              <Select
                label="Space Type"
                value={editData.spaceType}
                onChange={(e: any) => setEditData({ ...editData, spaceType: e.target.value })}
                options={Object.entries(spaceLabels).map(([v, l]) => ({ value: v, label: l }))}
              />
              {isAdmin && (
                <Select
                  label="Sales Rep"
                  value={editData.ownerId}
                  onChange={(e: any) => setEditData({ ...editData, ownerId: e.target.value })}
                  options={users.map((u: any) => ({ value: u.id, label: u.name || u.email }))}
                />
              )}
              {!isAdmin && (
                <div><p className="text-xs text-gray-500 mb-1">Sales Rep</p><p className="text-sm font-medium">{deal.owner?.name || deal.owner?.email || "N/A"}</p></div>
              )}
              <Input label="Expected Close" type="date" value={editData.expectedCloseDate} onChange={(e: any) => setEditData({ ...editData, expectedCloseDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" isLoading={updateMutation.isPending}>Save</Button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Value</p>
                <p className="font-semibold">QAR {deal.value.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stage</p>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#465FFF]/10 text-[#465FFF]">{deal.stage}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium">{deal.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Broker</p>
                <p className="font-medium">{deal.broker?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-medium">{locationLabels[deal.location] || deal.location}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Space Type</p>
                <p className="font-medium">{spaceLabels[deal.spaceType] || deal.spaceType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sales Rep</p>
                <p className="font-medium">{deal.owner?.name || deal.owner?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expected Close</p>
                <p className="font-medium">{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>
            {deal.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{deal.description}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" {...props} />
    </div>
  );
}

function ScheduleMeetingModal({ deal, onClose, onSave }: {
  deal: Deal;
  onClose: () => void;
  onSave: () => void;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(deal.meetingDate ?? "");
  const [time, setTime] = useState(deal.meetingTime ?? "08:30");
  const [location, setLocation] = useState(deal.meetingLocation ?? "");
  const [notes, setNotes] = useState(deal.meetingNotes ?? "");

  // 18 slots: 08:30 to 17:00 (last slot ends at 17:30)
  const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
    const totalMin = i * 30 + 510; // 510 = 8*60+30
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  const isSundayToThursday = (dateStr: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=Sun, 5=Fri, 6=Sat
    return day !== 5 && day !== 6;
  };

  const mutation = useMutation({
    mutationFn: (data: any) => dealsApi.scheduleMeeting(deal.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      onSave();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ meetingDate: date, meetingTime: time, meetingLocation: location, meetingNotes: notes });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={deal.meetingDate ? "Reschedule Meeting" : "Schedule Meeting"}>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="text-sm text-gray-500 mb-2">
          {deal.client?.name} — {deal.title}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={`w-full border rounded-lg p-2 text-sm ${!isSundayToThursday(date) && date ? "border-red-500" : ""}`}
          />
          {!isSundayToThursday(date) && date && (
            <p className="text-xs text-red-500 mt-1">Working days are Sunday to Thursday</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time <span className="text-red-500">*</span>
          </label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="w-full border rounded-lg p-2 text-sm"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">30-minute meeting, working hours 08:30–17:30</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            maxLength={500}
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="Meeting location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
            rows={3}
            placeholder="Meeting agenda or notes"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 min-h-[44px]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !date || !time || !location || !isSundayToThursday(date)}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 min-h-[44px]"
          >
            {mutation.isPending ? "Saving..." : deal.meetingDate ? "Reschedule" : "Schedule"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"value" | "date">("date");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [lossDeal, setLossDeal] = useState<Deal | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [meetingDeal, setMeetingDeal] = useState<Deal | null>(null);

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ["deals", "pipeline"],
    queryFn: async () => {
      const [activeRes, wonRes, lostRes] = await Promise.all([
        dealsApi.findAll(1, 100, { status: "active" }),
        dealsApi.findAll(1, 100, { status: "won" }),
        dealsApi.findAll(1, 100, { status: "lost" }),
      ]);
      return [
        ...activeRes.data,
        ...wonRes.data,
        ...lostRes.data,
      ];
    },
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients", "all"],
    queryFn: () => clientsApi.findAll(1, 1000),
  });

  const { data: brokersData } = useQuery({
    queryKey: ["brokers", "all"],
    queryFn: async () => {
      const result = await brokersApi.findAll(1, 1000);
      return result.data;
    },
  });

  const currentUser = useAuthStore((s) => s.user);
  const { data: usersData } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => usersApi.findAll(),
    enabled: currentUser?.role === "ADMIN",
  });

  const { data: calendarStatus } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: () => calendarApi.getStatus(),
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      dealsApi.update(id, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", "pipeline"] });
    },
  });

  const handleDragStart = (dealId: string) => {
    setDraggedDeal(dealId);
  };

  const handleDrop = (targetStageId: string) => {
    if (draggedDeal) {
      const deal = dealsData?.find((d) => d.id === draggedDeal);
      if (deal && normalizeStage(deal.stage) !== targetStageId) {
        updateStageMutation.mutate({ id: draggedDeal, stage: targetStageId.toUpperCase() });
      }
      setDraggedDeal(null);
    }
  };

  const handleAddDeal = (_stage: string) => {
    setShowCreateModal(true);
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
  };

  const handleWin = (deal: Deal) => {
    dealsApi.update(deal.id, { stage: "WON", confirmTerminal: true })
      .then(() => queryClient.invalidateQueries({ queryKey: ["deals", "pipeline"] }));
  };

  const handleLose = (deal: Deal) => {
    setLossDeal(deal);
    setLossReason("");
  };

  const confirmLose = () => {
    if (!lossDeal) return;
    dealsApi.markAsLost(lossDeal.id, lossReason)
      .then(() => {
        setLossDeal(null);
        queryClient.invalidateQueries({ queryKey: ["deals", "pipeline"] });
      });
  };

  const filteredDeals = useMemo(() => {
    if (!dealsData) return [];
    let deals = dealsData;
    if (filterOwner !== "all") {
      deals = deals.filter((d) => d.owner?.id === filterOwner);
    }
    if (filterLocation !== "all") {
      deals = deals.filter((d) => d.location === filterLocation);
    }
    if (filterTag !== "all") {
      if (filterTag === "OFFICERND") {
        deals = deals.filter((d) => !!d.officerndSyncId);
      } else {
        deals = deals.filter((d) => !d.officerndSyncId);
      }
    }
    if (sortBy === "value") {
      deals = [...deals].sort((a, b) => b.value - a.value);
    }
    return deals;
  }, [dealsData, filterOwner, filterLocation, filterTag, sortBy]);

  const getDealsByStage = (stageId: string) => {
    return filteredDeals.filter(
      (deal) => normalizeStage(deal.stage) === stageId
    );
  };

  const visibleStages = showTerminal
    ? PIPELINE_STAGES
    : PIPELINE_STAGES.filter((s) => s.id !== "won" && s.id !== "lost");

  const owners = useMemo(() => {
    if (!dealsData) return [];
    const map = new Map<string, { id: string; name: string }>();
    dealsData.forEach((d) => {
      if (d.owner && !map.has(d.owner.id)) {
        map.set(d.owner.id, {
          id: d.owner.id,
          name: d.owner.name || d.owner.email,
        });
      }
    });
    return Array.from(map.values());
  }, [dealsData]);

  const stats = useMemo(() => {
    if (!dealsData) return { total: 0, value: 0, projected: 0 };
    return {
      total: dealsData.length,
      value: dealsData.reduce((sum, d) => sum + d.value, 0),
      projected: dealsData
        .filter((d) => ["negotiation", "contract"].includes(normalizeStage(d.stage)))
        .reduce((sum, d) => sum + d.value, 0),
    };
  }, [dealsData]);

  return (
    <div className="flex flex-col h-[calc(100dvh-101px)] -mb-20 md:-mb-24 !pb-0 overflow-hidden !max-w-none">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-5 w-5 text-[#465FFF]" />
            <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
          </div>
          <button
            onClick={() => handleAddDeal("new")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#465FFF] text-white text-sm font-medium rounded-lg hover:bg-[#3B4FE4] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Opportunity
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <option value="all">All Locations</option>
            <option value="BARWA_ALSADD">Barwa Alsadd</option>
            <option value="ELEMENT_WESTBAY">Element Westbay</option>
            <option value="MARINA50_LUSAIL">Marina 50 Lusail</option>
          </select>

          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <option value="all">All Owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <option value="all">All Deals</option>
            <option value="OFFICERND">OfficeRnD Renewal</option>
            <option value="REGULAR">Regular</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "value" | "date")}
            className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <option value="date">Newest first</option>
            <option value="value">Highest value</option>
          </select>

          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`text-xs px-2 py-1 rounded border ${showTerminal ? "bg-gray-100" : ""}`}
            aria-label={showTerminal ? "Hide Won/Lost columns" : "Show Won/Lost columns"}
          >
            {showTerminal ? "Hide" : "Show"} Won/Lost
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#465FFF]" />
            <span className="text-sm text-gray-500">Projected</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCompact(stats.projected)}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCompact(stats.value)}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-gray-500">Active</span>
            <span className="text-sm font-bold text-gray-900">
              {stats.total} deals
            </span>
          </div>
          {calendarStatus && !calendarStatus.connected && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              <AlertCircle className="w-3.5 h-3.5" />
              Google Calendar not connected
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div data-pipeline-board className="flex-1 bg-gray-50 overflow-hidden min-h-0 flex flex-col">
        <div className="flex gap-3 p-4 flex-1 min-h-0 overflow-hidden">
          {visibleStages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={getDealsByStage(stage.id)}
              isLoading={isLoading}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onAddDeal={handleAddDeal}
              onDealClick={handleDealClick}
              onWin={handleWin}
              onLose={handleLose}
              onScheduleMeeting={(deal) => setMeetingDeal(deal)}
            />
          ))}
        </div>
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <DealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} brokers={brokersData || []} users={usersData || []} />
      )}

      {/* Create Deal Modal */}
      {showCreateModal && (
        <CreateDealModal
          clients={clientsData?.data || []}
          users={usersData || []}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Loss Reason Modal */}
      {lossDeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setLossDeal(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Mark as Lost</h2>
              <button onClick={() => setLossDeal(null)} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Mark <strong>{lossDeal.title}</strong> as lost?
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={3}
                  placeholder="Why was this deal lost?"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setLossDeal(null)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLose}
                  disabled={!lossReason.trim()}
                  className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 min-h-[44px]"
                >
                  Mark as Lost
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {meetingDeal && (
        <ScheduleMeetingModal
          deal={meetingDeal}
          onClose={() => setMeetingDeal(null)}
          onSave={() => setMeetingDeal(null)}
        />
      )}
    </div>
  );
}
