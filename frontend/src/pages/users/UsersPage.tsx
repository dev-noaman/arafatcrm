import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/api/users";
import { Card, Button, Input, Select, Badge } from "@/components/ui";
import { UserPlus, Trash2, Edit2, Upload, Download } from "lucide-react";
import type { CreateUserDto } from "@/api/users";

const CSV_TEMPLATE = `email,password,name,role
user1@example.com,password123,User One,SALES
user2@example.com,password123,User Two,SALES`;

function parseCsv(text: string): CreateUserDto[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const emailIdx = headers.indexOf("email");
  const passwordIdx = headers.indexOf("password");
  const nameIdx = headers.indexOf("name");
  const roleIdx = headers.indexOf("role");

  if (emailIdx === -1 || passwordIdx === -1) return [];

  const users: CreateUserDto[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (!cols[emailIdx] || !cols[passwordIdx]) continue;
    users.push({
      email: cols[emailIdx],
      password: cols[passwordIdx],
      name: nameIdx >= 0 ? cols[nameIdx] : undefined,
      role: roleIdx >= 0 && ["ADMIN", "SALES"].includes(cols[roleIdx]) ? (cols[roleIdx] as "ADMIN" | "SALES") : undefined,
    });
  }
  return users;
}

function BulkUploadModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);

  const bulkMutation = useMutation({
    mutationFn: (users: CreateUserDto[]) => usersApi.bulkCreate(users),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      setResult({ created: 0, errors: [err.response?.data?.message || "Upload failed"] });
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const users = parseCsv(text);
      if (users.length === 0) {
        setResult({ created: 0, errors: ["No valid rows found. Ensure CSV has email,password columns."] });
        return;
      }
      bulkMutation.mutate(users);
    };
    reader.readAsText(file);
  }, [bulkMutation]);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Bulk Add Users</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &#x2715;
          </button>
        </div>

        <div className="space-y-4">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm text-[#465FFF] hover:underline"
          >
            <Download className="h-4 w-4" /> Download CSV Template
          </button>

          <p className="text-xs text-gray-500">
            CSV must have columns: <code className="bg-gray-100 px-1 rounded">email</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">password</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">name</code> (optional),{" "}
            <code className="bg-gray-100 px-1 rounded">role</code> (optional: ADMIN or SALES)
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={bulkMutation.isPending}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#465FFF] file:text-white hover:file:bg-[#3B4FE4] file:cursor-pointer"
          />

          {bulkMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-4 w-4 border-2 border-[#465FFF] border-t-transparent rounded-full animate-spin" />
              Uploading...
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-lg text-sm ${result.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
              <p className="font-medium">{result.created} user(s) created successfully.</p>
              {result.errors.length > 0 && (
                <ul className="mt-2 text-amber-700 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} className="w-full">
            {result ? "Close" : "Cancel"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; email: string; name: string; role: "ADMIN" | "SALES" } | null>(null);

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.findAll(),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { email: string; password: string; name: string; role: "ADMIN" | "SALES" }) => usersApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { email?: string; name?: string; role?: "ADMIN" | "SALES" } }) =>
      usersApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsBulkModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2 inline" /> Bulk Import
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2 inline" /> Add User
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : users?.length ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {user.name || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={user.role === "ADMIN" ? "danger" : "info"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => setEditingUser({ id: user.id, email: user.email, name: user.name || "", role: user.role })}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        <Edit2 className="h-4 w-4 inline" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4 inline" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bulk Upload Modal */}
      {isBulkModalOpen && <BulkUploadModal onClose={() => setIsBulkModalOpen(false)} />}

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &#x2715;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate({
                  email: formData.get("email") as string,
                  password: formData.get("password") as string,
                  name: formData.get("name") as string,
                  role: formData.get("role") as "ADMIN" | "SALES",
                });
              }}
              className="space-y-4"
            >
              <Input label="Email" name="email" type="email" required placeholder="user@example.com" />
              <Input label="Password" name="password" type="password" required minLength={6} placeholder="Minimum 6 characters" />
              <Input label="Name (Optional)" name="name" type="text" placeholder="John Doe" />
              <Select
                label="Role"
                name="role"
                defaultValue="SALES"
                options={[
                  { value: "SALES", label: "Sales" },
                  { value: "ADMIN", label: "Admin" },
                ]}
              />
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending} className="flex-1">
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                &#x2715;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateMutation.mutate({
                  id: editingUser.id,
                  dto: {
                    email: formData.get("email") as string,
                    name: formData.get("name") as string,
                    role: formData.get("role") as "ADMIN" | "SALES",
                  },
                });
              }}
              className="space-y-4"
            >
              <Input label="Email" name="email" type="email" required defaultValue={editingUser.email} />
              <Input label="Name" name="name" type="text" defaultValue={editingUser.name} />
              <Select
                label="Role"
                name="role"
                defaultValue={editingUser.role}
                options={[
                  { value: "SALES", label: "Sales" },
                  { value: "ADMIN", label: "Admin" },
                ]}
              />
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => setEditingUser(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" isLoading={updateMutation.isPending} className="flex-1">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
