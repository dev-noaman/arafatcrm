import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients";
import { usersApi } from "@/api/users";
import { Button, Card, DataTable, Badge, Input, Select, PhoneInput } from "@/components/ui";
import { useAuthStore } from "@/contexts/auth-store";
import { Plus, Pencil, Trash2, Eye, FileUp, X, Download } from "lucide-react";
import type { Client } from "@/types/client";

const CLIENT_SOURCES = [
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

const sourceVariants: Record<string, "default" | "info" | "success" | "warning"> = {
  GOOGLE: "success",
  REFERRAL: "warning",
  FACEBOOK: "default",
  INSTAGRAM: "default",
  TIKTOK: "default",
};

export default function ClientsPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["clients", page],
    queryFn: () => clientsApi.findAll(page, 20),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const columns = [
    { key: "name", title: "Name", render: (client: Client) => (
      <div>
        <div className="font-medium text-gray-900">{client.name}</div>
        <div className="text-gray-500 text-xs">{client.email}</div>
      </div>
    )},
    { key: "phone", title: "Phone", render: (client: Client) => client.phone || "-" },
    { key: "company", title: "Company", render: (client: Client) => client.company || "-" },
    {
      key: "source",
      title: "Source",
      render: (client: Client) => (
        <Badge variant={sourceVariants[client.source] || "default"}>{client.source}</Badge>
      ),
    },
    { key: "createdAt", title: "Created", render: (client: Client) => new Date(client.createdAt).toLocaleDateString() },
  ];

  const actions = (client: Client) => (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={() => setViewClient(client)} aria-label="View client">
        <Eye className="h-4 w-4" />
      </Button>
      {isAdmin && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setEditClient(client)} aria-label="Edit client">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm(`Delete client ${client.name}?`)) {
                deleteMutation.mutate(client.id);
              }
            }}
            aria-label="Delete client"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      <Card>
        <DataTable
          data={data?.data || []}
          columns={columns}
          actions={actions}
          isLoading={isLoading}
          emptyMessage="No clients found. Add your first client to get started."
        />

        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.total)} of {data.total} clients
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

      {showModal && <CreateClientModal onClose={() => setShowModal(false)} />}
      {showBulkModal && <BulkClientModal onClose={() => setShowBulkModal(false)} />}
      {viewClient && <ViewClientModal client={viewClient} onClose={() => setViewClient(null)} />}
      {editClient && <EditClientModal client={editClient} onClose={() => setEditClient(null)} />}
    </div>
  );
}

function CreateClientModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "ADMIN";
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", company: "", source: "", assignedToId: "" });
  const [error, setError] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => usersApi.findAll(),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (dto: any) => clientsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    },
    onError: (e: any) => {
      setError(e.response?.data?.message || "Failed to create client");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      assignedToId: formData.assignedToId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Add New Client</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <PhoneInput
            label="Phone"
            value={formData.phone}
            onChange={(val) => setFormData({ ...formData, phone: val })}
          />
          <Input
            label="Company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
          <Select
            label="Source"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            options={[
              { value: "", label: "Select Source" },
              ...CLIENT_SOURCES,
            ]}
            required
          />
          {isAdmin && users && (
            <Select
              label="Assign To"
              value={formData.assignedToId}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
              options={[
                { value: "", label: "Unassigned" },
                ...users.map((u) => ({ value: u.id, label: u.name || u.email })),
              ]}
            />
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>
              Create Client
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── View Client Modal ─── */
function ViewClientModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const { data: freshClient } = useQuery({
    queryKey: ["clients", client.id],
    queryFn: () => clientsApi.findOne(client.id),
  });
  const current = freshClient || client;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{current.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-sm text-gray-500">Email</span><div className="font-medium">{current.email}</div></div>
            <div><span className="text-sm text-gray-500">Phone</span><div className="font-medium">{current.phone || "-"}</div></div>
            <div><span className="text-sm text-gray-500">Company</span><div className="font-medium">{current.company || "-"}</div></div>
            <div><span className="text-sm text-gray-500">Source</span><div><Badge variant={sourceVariants[current.source] || "default"}>{current.source}</Badge></div></div>
            <div><span className="text-sm text-gray-500">Assigned To</span><div className="font-medium">{current.assignedTo?.name || "Unassigned"}</div></div>
            <div><span className="text-sm text-gray-500">Created</span><div className="font-medium">{new Date(current.createdAt).toLocaleDateString()}</div></div>
          </div>
          {current.notes && (
            <div>
              <span className="text-sm text-gray-500">Notes</span>
              <div className="mt-1 text-sm bg-gray-50 rounded-lg p-3">{current.notes}</div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Client Modal ─── */
function EditClientModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: client.name,
    email: client.email,
    phone: client.phone || "",
    company: client.company || "",
    source: client.source,
    notes: client.notes || "",
  });
  const [error, setError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (dto: any) => clientsApi.update(client.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.message || "Failed to update client"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Name *" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Email *" type="email" value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} required />
          <PhoneInput label="Phone" value={formData.phone} onChange={(val) => setFormData({ ...formData, phone: val })} />
          <Input label="Company" value={formData.company} onChange={(e: any) => setFormData({ ...formData, company: e.target.value })} />
          <Select
            label="Source"
            value={formData.source}
            onChange={(e: any) => setFormData({ ...formData, source: e.target.value })}
            options={CLIENT_SOURCES}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Bulk Import Client Modal ─── */
function BulkClientModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [csvText, setCsvText] = useState("");
  const [source, setSource] = useState("REFERRAL");
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkMutation = useMutation({
    mutationFn: (dtos: any[]) => clientsApi.bulkCreate(dtos),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setResult(data);
    },
    onError: (e: any) => setError(e.response?.data?.message || "Bulk import failed"),
  });

  const parseCsvLines = (text: string): string[][] => {
    return text.trim().split("\n").map((line) => line.split(",").map((s) => s.trim())).filter((parts) => parts[0]);
  };

  const handleImport = () => {
    if (!csvText.trim()) return;
    const rows = parseCsvLines(csvText);
    const dtos: any[] = rows.map((parts) => ({
      name: parts[0],
      email: parts[1] || "",
      phone: parts[2] || undefined,
      company: parts[3] || undefined,
      source: parts[4] || source,
    })).filter((d) => d.name && d.email);
    if (dtos.length === 0) { setError("No valid rows found"); return; }
    setError("");
    bulkMutation.mutate(dtos);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let text = ev.target?.result as string || "";
      const firstLine = text.split("\n")[0]?.toLowerCase() || "";
      if (firstLine.includes("name") && firstLine.includes("email")) {
        text = text.split("\n").slice(1).join("\n");
      }
      setCsvText(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const header = "Name,Email,Phone,Company,Source";
    const rows = [
      "Ahmed Hassan,a.hassan@pearlgroup.qa,+974 5555 1234,Pearl Group,REFERRAL",
      "Sara Ali,s.ali@techcorp.qa,,TechCorp,FACEBOOK",
      "Khalid Ibrahim,k.ibrahim@gmail.com,+974 3333 6789,,GOOGLE",
    ];
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bulk Import Clients</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Info + Template */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 space-y-2">
            <div>
              CSV columns: <code className="font-mono text-xs">Name, Email, Phone, Company, Source</code>
            </div>
            <div>
              Or simpler: <code className="font-mono text-xs">Name, Email, Phone, Company</code> and set source below.
            </div>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              Download Template
            </button>
          </div>

          {/* File Upload */}
          <div>
            <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-4 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <FileUp className="h-5 w-5" />
              Upload CSV File
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-500">or paste below</span></div>
          </div>

          <Select
            label="Source (if not in CSV)"
            options={CLIENT_SOURCES}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV Data</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 font-mono"
              rows={8}
              placeholder={"Ahmed Hassan, a.hassan@pearlgroup.qa, +974 5555 1234, Pearl Group\nSara Ali, s.ali@techcorp.qa, , TechCorp"}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {result && (
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <div className="font-medium text-green-700">Created: {result.created} clients</div>
              {result.errors.length > 0 && (
                <div className="text-red-600">
                  Errors: {result.errors.map((e) => `Row ${e.row}: ${e.message}`).join("; ")}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Close</Button>
            {!result && (
              <Button className="flex-1" isLoading={bulkMutation.isPending} onClick={handleImport} disabled={!csvText.trim()}>
                Import
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
