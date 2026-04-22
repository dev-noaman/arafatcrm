import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dealsApi } from "@/api/deals";
import { clientsApi } from "@/api/clients";
import { usersApi } from "@/api/users";
import { Button, Card, DataTable, Badge, Select, PhoneInput, ClientAutocomplete } from "@/components/ui";
import { useAuthStore } from "@/contexts/auth-store";
import { Plus, Pencil, Trash2, Eye, X } from "lucide-react";
import type { Deal } from "@/types/deal";

const statusVariants: Record<string, "success" | "warning" | "danger" | "info"> = {
  active: "success",
  won: "info",
  lost: "danger",
};

const stageColors: Record<string, string> = {
  lead: "bg-gray-200 text-gray-800",
  NEW: "bg-blue-200 text-blue-800",
  QUALIFIED: "bg-indigo-200 text-indigo-800",
  MEETING: "bg-purple-200 text-purple-800",
  PROPOSAL: "bg-yellow-200 text-yellow-800",
  NEGOTIATION: "bg-orange-200 text-orange-800",
  CONTRACT: "bg-amber-200 text-amber-800",
  WON: "bg-green-200 text-green-800",
  LOST: "bg-red-200 text-red-800",
};

export default function DealsPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewingDeal, setViewingDeal] = useState<Deal | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["deals", page, statusFilter],
    queryFn: () => dealsApi.findAll(page, 20, statusFilter ? { status: statusFilter } : undefined),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients", "all"],
    queryFn: () => clientsApi.findAll(1, 1000),
  });

  const currentUser = useAuthStore((s) => s.user);
  const { data: users } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => usersApi.findAll(),
    enabled: currentUser?.role === "ADMIN",
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const columns = [
    { key: "title", title: "Deal", render: (deal: Deal) => (
      <div>
        <div className="font-medium text-gray-900">{deal.title}</div>
        <div className="text-gray-500 text-xs">{deal.client?.name}</div>
      </div>
    )},
    { key: "value", title: "Value", render: (deal: Deal) => `QAR ${deal.value.toLocaleString()}` },
    { key: "commissionAmount", title: "Commission", render: (deal: Deal) => deal.commissionAmount ? `QAR ${deal.commissionAmount.toLocaleString()}` : "-" },
    {
      key: "status",
      title: "Status",
      render: (deal: Deal) => (
        <Badge variant={statusVariants[deal.status] || "default"}>{deal.status}</Badge>
      ),
    },
    {
      key: "stage",
      title: "Stage",
      render: (deal: Deal) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageColors[deal.stage] || "bg-gray-100 text-gray-800"}`}>
          {deal.stage}
        </span>
      ),
    },
    { key: "expectedCloseDate", title: "Close Date", render: (deal: Deal) => deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "-" },
    { key: "owner", title: "Sales Rep", render: (deal: Deal) => deal.owner?.name || "-" },
    { key: "broker", title: "Broker", render: (deal: Deal) => deal.broker?.name || "N/A" },
  ];

  const actions = (deal: Deal) => (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={() => setViewingDeal(deal)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setEditingDeal(deal)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (confirm(`Delete deal "${deal.title}"?`)) {
            deleteMutation.mutate(deal.id);
          }
        }}
      >
        <Trash2 className="h-4 w-4 text-red-600" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Deal
        </Button>
      </div>

      <div className="flex gap-4">
        <Select
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Statuses" },
            { value: "active", label: "Active" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
          ]}
        />
      </div>

      <Card>
        <DataTable
          data={data?.data || []}
          columns={columns}
          actions={actions}
          isLoading={isLoading}
          emptyMessage="No deals found."
        />

        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.total)} of {data.total} deals
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * 20 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showModal && (
        <CreateDealModal
          clients={clients?.data || []}
          users={users || []}
          onClose={() => setShowModal(false)}
        />
      )}

      {viewingDeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewingDeal(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{viewingDeal.title}</h2>
              <button onClick={() => setViewingDeal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Value</p><p className="font-semibold">QAR {viewingDeal.value.toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><Badge variant={statusVariants[viewingDeal.status] || "default"}>{viewingDeal.status}</Badge></div>
              <div><p className="text-xs text-gray-500">Stage</p><span className={`px-2 py-1 rounded-full text-xs font-medium ${stageColors[viewingDeal.stage] || "bg-gray-100 text-gray-800"}`}>{viewingDeal.stage}</span></div>
              <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{viewingDeal.phone || "N/A"}</p></div>
              <div><p className="text-xs text-gray-500">Broker</p><p className="font-medium">{viewingDeal.broker?.name || "N/A"}</p></div>
              <div><p className="text-xs text-gray-500">Sales Rep</p><p className="font-medium">{viewingDeal.owner?.name || viewingDeal.owner?.email || "N/A"}</p></div>
              <div><p className="text-xs text-gray-500">Location</p><p className="font-medium">{viewingDeal.location}</p></div>
              <div><p className="text-xs text-gray-500">Space Type</p><p className="font-medium">{{ CLOSED_OFFICE: "Closed Office", ABC_ADDRESS: "Abc Address", ABC_FLEX: "Abc Flex", ABC_ELITE: "Abc Elite", WORKSTATION: "Workstation", OFFICE: "Office" }[viewingDeal.spaceType] || viewingDeal.spaceType}</p></div>
              {viewingDeal.commissionAmount != null && <div><p className="text-xs text-gray-500">Commission</p><p className="font-semibold text-emerald-600">QAR {viewingDeal.commissionAmount.toLocaleString()}</p></div>}
              {viewingDeal.expectedCloseDate && <div><p className="text-xs text-gray-500">Close Date</p><p className="font-medium">{new Date(viewingDeal.expectedCloseDate).toLocaleDateString()}</p></div>}
            </div>
            <div className="px-6 py-4 border-t flex gap-2">
              <Button variant="secondary" onClick={() => setViewingDeal(null)} className="flex-1">Close</Button>
              <Button onClick={() => { setEditingDeal(viewingDeal); setViewingDeal(null); }} className="flex-1">Edit</Button>
            </div>
          </div>
        </div>
      )}

      {editingDeal && (
        <EditDealModal deal={editingDeal} onClose={() => setEditingDeal(null)} />
      )}
    </div>
  );
}

function CreateDealModal({ clients, users, onClose }: { clients: any[]; users: any[]; onClose: () => void }) {
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
      const selectedClient = clients.find((c) => c.id === formData.clientId);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">Add New Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
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
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2 pt-4 sticky bottom-0 bg-white">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>Create Deal</Button>
          </div>
        </form>
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

function EditDealModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: deal.title,
    value: String(deal.value),
    stage: deal.stage,
  });
  const [error, setError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (dto: any) => dealsApi.update(deal.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onClose();
    },
    onError: (e: any) => {
      setError(e.response?.data?.message || "Failed to update deal");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Edit Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const isTerminal = formData.stage === "WON" || formData.stage === "LOST";
            if (isTerminal && !confirm(`Mark this deal as ${formData.stage}?`)) return;
            updateMutation.mutate({
              title: formData.title,
              value: parseFloat(formData.value),
              stage: formData.stage,
              ...(isTerminal ? { confirmTerminal: true } : {}),
            });
          }}
          className="p-6 space-y-4"
        >
          <Input label="Title" value={formData.title} onChange={(e: any) => setFormData({ ...formData, title: e.target.value })} required />
          <Input label="Value (QAR)" type="number" value={formData.value} onChange={(e: any) => setFormData({ ...formData, value: e.target.value })} required />
          <Select
            label="Stage"
            value={formData.stage}
            onChange={(e: any) => setFormData({ ...formData, stage: e.target.value })}
            options={[
              { value: "lead", label: "Lead" },
              { value: "NEW", label: "New" },
              { value: "QUALIFIED", label: "Qualified" },
              { value: "MEETING", label: "Meeting" },
              { value: "PROPOSAL", label: "Proposal" },
              { value: "NEGOTIATION", label: "Negotiation" },
              { value: "CONTRACT", label: "Contract" },
              { value: "WON", label: "Won" },
              { value: "LOST", label: "Lost" },
            ]}
          />
          {error && <div className="text-sm text-red-600">{String(error)}</div>}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
