import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { brokersApi } from "@/api/brokers";
import { Button, Card, DataTable, Input, PhoneInput, Select, Badge } from "@/components/ui";
import { Plus, Pencil, Trash2, Eye, Upload, Download, X, FileText, FileUp } from "lucide-react";
import { useAuthStore } from "@/contexts/auth-store";
import type { Broker, BrokerType, BrokerDocumentType, CreateBrokerDto, UpdateBrokerDto } from "@/types/broker";

const BROKER_TYPES: { value: BrokerType; label: string }[] = [
  { value: "PERSONAL", label: "Personal" },
  { value: "CORPORATE", label: "Corporate" },
];

const DOC_TYPES: { value: BrokerDocumentType; label: string; personal?: boolean; corporate?: boolean }[] = [
  { value: "QID", label: "QID", personal: true, corporate: true },
  { value: "CR", label: "CR (Commercial Registration)", corporate: true },
  { value: "TL", label: "TL (Trade License)", corporate: true },
  { value: "COMPUTER_CARD", label: "Computer Card", corporate: true },
  { value: "OTHERS", label: "Others" },
];

export default function BrokersPage() {
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [viewBroker, setViewBroker] = useState<Broker | null>(null);
  const [editBroker, setEditBroker] = useState<Broker | null>(null);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["brokers", page],
    queryFn: () => brokersApi.findAll(page, 20),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => brokersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brokers"] }),
  });

  const columns = [
    {
      key: "name",
      title: "Name / Email",
      render: (broker: Broker) => (
        <div>
          <div className="font-medium text-gray-900">{broker.name}</div>
          <div className="text-gray-500 text-xs">{broker.email}</div>
        </div>
      ),
    },
    { key: "phone", title: "Phone", render: (b: Broker) => b.phone || "-" },
    { key: "company", title: "Company", render: (b: Broker) => b.company || "-" },
    {
      key: "brokerType",
      title: "Type",
      render: (b: Broker) => (
        <Badge variant={b.brokerType === "CORPORATE" ? "info" : "default"} size="sm">
          {b.brokerType === "CORPORATE" ? "Corporate" : "Personal"}
        </Badge>
      ),
    },
    {
      key: "contract",
      title: "Contract",
      render: (b: Broker) => {
        if (!b.contractFrom || !b.contractTo) return "-";
        const from = new Date(b.contractFrom).toLocaleDateString();
        const to = new Date(b.contractTo).toLocaleDateString();
        return (
          <div className="text-xs">
            <div>{from}</div>
            <div className="text-gray-400">to {to}</div>
          </div>
        );
      },
    },
    {
      key: "isActive",
      title: "Status",
      render: (b: Broker) => (
        <Badge variant={b.isActive ? "success" : "danger"} size="sm">
          {b.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const actions = (broker: Broker) => (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={() => setViewBroker(broker)}>
        <Eye className="h-4 w-4" />
      </Button>
      {isAdmin && (
        <Button variant="ghost" size="sm" onClick={() => setEditBroker(broker)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm(`Delete broker ${broker.name}?`)) deleteMutation.mutate(broker.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Brokers</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Broker
          </Button>
        </div>
      </div>

      <Card>
        <DataTable
          data={data?.data || []}
          columns={columns}
          actions={actions}
          isLoading={isLoading}
          emptyMessage="No brokers found."
        />
        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.total)} of {data.total} brokers
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showCreateModal && (
        <CreateBrokerModal onClose={() => setShowCreateModal(false)} />
      )}
      {showBulkModal && (
        <BulkBrokerModal onClose={() => setShowBulkModal(false)} />
      )}
      {viewBroker && (
        <ViewBrokerModal broker={viewBroker} onClose={() => setViewBroker(null)} isAdmin={isAdmin} />
      )}
      {editBroker && (
        <EditBrokerModal broker={editBroker} onClose={() => setEditBroker(null)} />
      )}
    </div>
  );
}

/* ─── Create Broker Modal ─── */
function CreateBrokerModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateBrokerDto>({
    name: "",
    email: "",
    phone: "",
    company: "",
    brokerType: "PERSONAL",
    contractFrom: "",
    contractTo: "",
    notes: "",
  });
  const [phoneValue, setPhoneValue] = useState("");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: (dto: CreateBrokerDto) => brokersApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.message || "Failed to create broker"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, phone: phoneValue || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add New Broker</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Email *" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <PhoneInput label="Phone" value={phoneValue} onChange={setPhoneValue} />
          <Input label="Company" value={formData.company || ""} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />

          <Select
            label="Broker Type *"
            options={BROKER_TYPES}
            value={formData.brokerType}
            onChange={(e) => setFormData({ ...formData, brokerType: e.target.value as BrokerType })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contract From *"
              type="date"
              value={formData.contractFrom}
              onChange={(e) => setFormData({ ...formData, contractFrom: e.target.value })}
              required
            />
            <Input
              label="Contract To *"
              type="date"
              value={formData.contractTo}
              onChange={(e) => setFormData({ ...formData, contractTo: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>Create Broker</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── View Broker Modal ─── */
function ViewBrokerModal({ broker, onClose, isAdmin }: { broker: Broker; onClose: () => void; isAdmin: boolean }) {
  const [uploadingDocType, setUploadingDocType] = useState<BrokerDocumentType | "">("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: freshBroker } = useQuery({
    queryKey: ["brokers", broker.id],
    queryFn: () => brokersApi.findOne(broker.id),
  });

  const current = freshBroker || broker;

  const uploadMutation = useMutation({
    mutationFn: ({ file, docType }: { file: File; docType: string }) =>
      brokersApi.uploadDocument(broker.id, file, docType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      setUploadingDocType("");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => brokersApi.deleteDocument(broker.id, docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brokers"] }),
  });

  const requiredDocs = DOC_TYPES.filter((d) =>
    current.brokerType === "PERSONAL" ? d.personal : d.corporate
  );
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{current.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-sm text-gray-500">Email</span><div className="font-medium">{current.email}</div></div>
            <div><span className="text-sm text-gray-500">Phone</span><div className="font-medium">{current.phone || "-"}</div></div>
            <div><span className="text-sm text-gray-500">Company</span><div className="font-medium">{current.company || "-"}</div></div>
            <div><span className="text-sm text-gray-500">Type</span><div><Badge variant={current.brokerType === "CORPORATE" ? "info" : "default"} size="sm">{current.brokerType === "CORPORATE" ? "Corporate" : "Personal"}</Badge></div></div>
            <div><span className="text-sm text-gray-500">Contract</span><div className="font-medium text-sm">{current.contractFrom ? `${new Date(current.contractFrom).toLocaleDateString()} — ${new Date(current.contractTo!).toLocaleDateString()}` : "-"}</div></div>
            <div><span className="text-sm text-gray-500">Status</span><div><Badge variant={current.isActive ? "success" : "danger"} size="sm">{current.isActive ? "Active" : "Inactive"}</Badge></div></div>
            {current.managedBy && (
              <div><span className="text-sm text-gray-500">Managed By</span><div className="font-medium">{current.managedBy.name}</div></div>
            )}
          </div>

          {current.notes && (
            <div>
              <span className="text-sm text-gray-500">Notes</span>
              <div className="mt-1 text-sm bg-gray-50 rounded-lg p-3">{current.notes}</div>
            </div>
          )}

          {/* Documents Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Documents</h3>
            <div className="space-y-2">
              {requiredDocs.map((dt) => {
                const existing = current.documents?.find((d) => d.docType === dt.value);
                return (
                  <div key={dt.value} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">{dt.label}</span>
                    </div>
                    {existing ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{existing.originalName}</span>
                        <a
                          href={brokersApi.getDocumentUrl(existing.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (confirm("Delete this document?")) deleteDocMutation.mutate(existing.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setUploadingDocType(dt.value);
                          fileInputRef.current?.click();
                        }}
                      >
                        <Upload className="h-3 w-3 mr-1" /> Upload
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">Not uploaded</span>
                    )}
                  </div>
                );
              })}
              {/* Others (optional) */}
              {!requiredDocs.find((d) => d.value === "OTHERS") && isAdmin && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">Others (optional)</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setUploadingDocType("OTHERS");
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Upload
                  </Button>
                </div>
              )}
              {/* Show existing OTHERS docs */}
              {current.documents?.filter((d) => d.docType === "OTHERS").map((doc) => (
                <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{doc.originalName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={brokersApi.getDocumentUrl(doc.path)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      <Download className="h-4 w-4" />
                    </a>
                    {isAdmin && (
                      <button onClick={() => { if (confirm("Delete?")) deleteDocMutation.mutate(doc.id); }} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && uploadingDocType) {
                  uploadMutation.mutate({ file, docType: uploadingDocType });
                  e.target.value = "";
                }
              }}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Broker Modal ─── */
function EditBrokerModal({ broker, onClose }: { broker: Broker; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UpdateBrokerDto>({
    name: broker.name,
    email: broker.email,
    phone: broker.phone || "",
    company: broker.company || "",
    brokerType: broker.brokerType,
    contractFrom: broker.contractFrom ? broker.contractFrom.split("T")[0] : "",
    contractTo: broker.contractTo ? broker.contractTo.split("T")[0] : "",
    isActive: broker.isActive,
    notes: broker.notes || "",
  });
  const [error, setError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateBrokerDto) => brokersApi.update(broker.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.message || "Failed to update broker"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Broker</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Name *" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Email *" type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <PhoneInput label="Phone" value={formData.phone || ""} onChange={(val) => setFormData({ ...formData, phone: val })} />
          <Input label="Company" value={formData.company || ""} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />

          <Select
            label="Broker Type *"
            options={BROKER_TYPES}
            value={formData.brokerType || "PERSONAL"}
            onChange={(e) => setFormData({ ...formData, brokerType: e.target.value as BrokerType })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contract From *"
              type="date"
              value={formData.contractFrom || ""}
              onChange={(e) => setFormData({ ...formData, contractFrom: e.target.value })}
              required
            />
            <Input
              label="Contract To *"
              type="date"
              value={formData.contractTo || ""}
              onChange={(e) => setFormData({ ...formData, contractTo: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive || false}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              value={formData.notes || ""}
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

/* ─── Bulk Import Broker Modal ─── */
function BulkBrokerModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [csvText, setCsvText] = useState("");
  const [brokerType, setBrokerType] = useState<BrokerType>("PERSONAL");
  const [contractFrom, setContractFrom] = useState("");
  const [contractTo, setContractTo] = useState("");
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkMutation = useMutation({
    mutationFn: (dtos: CreateBrokerDto[]) => brokersApi.bulkCreate(dtos),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      setResult(data);
    },
    onError: (e: any) => setError(e.response?.data?.message || "Bulk import failed"),
  });

  const parseCsvLines = (text: string): string[][] => {
    return text.trim().split("\n").map((line) => line.split(",").map((s) => s.trim())).filter((parts) => parts[0]);
  };

  const buildDtos = (rows: string[][]): CreateBrokerDto[] => {
    return rows.map((parts) => ({
      name: parts[0],
      email: parts[1] || "",
      phone: parts[2] || undefined,
      company: parts[3] || undefined,
      brokerType,
      contractFrom,
      contractTo,
    })).filter((d) => d.name && d.email);
  };

  const handleImport = () => {
    if (!csvText.trim() || !contractFrom || !contractTo) return;
    const dtos = buildDtos(parseCsvLines(csvText));
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
      // Strip header row if it looks like one
      const firstLine = text.split("\n")[0]?.toLowerCase() || "";
      if (firstLine.includes("name") && firstLine.includes("email")) {
        text = text.split("\n").slice(1).join("\n");
      }
      setCsvText(text);
      // Extract brokerType from CSV if present
      const firstRow = parseCsvLines(text)[0];
      if (firstRow && firstRow[4] && (firstRow[4].toUpperCase() === "PERSONAL" || firstRow[4].toUpperCase() === "CORPORATE")) {
        setBrokerType(firstRow[4].toUpperCase() as BrokerType);
      }
      if (firstRow && firstRow[5]) setContractFrom(firstRow[5]);
      if (firstRow && firstRow[6]) setContractTo(firstRow[6]);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const header = "Name,Email,Phone,Company,BrokerType,ContractFrom,ContractTo";
    const rows = [
      "Mohammed Al-Kuwari,m.kuwari@gmail.com,+974 4444 5555,Al-Kuwari Estates,PERSONAL,2026-01-01,2026-12-31",
      "Gulf Intermediary,info@gulfintermediary.com,,Gulf Intermediary,CORPORATE,2026-01-01,2026-12-31",
    ];
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "broker_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bulk Import Brokers</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Info + Template */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 space-y-2">
            <div>
              CSV columns: <code className="font-mono text-xs">Name, Email, Phone, Company, BrokerType, ContractFrom, ContractTo</code>
            </div>
            <div>
              Or use a simpler format: <code className="font-mono text-xs">Name, Email, Phone, Company</code> and set type/dates below.
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

          <Select label="Broker Type" options={BROKER_TYPES} value={brokerType} onChange={(e) => setBrokerType(e.target.value as BrokerType)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contract From *" type="date" value={contractFrom} onChange={(e) => setContractFrom(e.target.value)} required />
            <Input label="Contract To *" type="date" value={contractTo} onChange={(e) => setContractTo(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV Data</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 font-mono"
              rows={8}
              placeholder={"Mohammed Al-Kuwari, m.kuwari@gmail.com, +974 4444 5555, Al-Kuwari Estates\nGulf Intermediary, info@gulfintermediary.com, , Gulf Intermediary"}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {result && (
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <div className="font-medium text-green-700">Created: {result.created} brokers</div>
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
              <Button className="flex-1" isLoading={bulkMutation.isPending} onClick={handleImport} disabled={!csvText.trim() || !contractFrom || !contractTo}>
                Import
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
