import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataSourcesApi } from "@/api/data-sources";
import { Button, Card } from "@/components/ui";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export default function DataSourcesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; isActive: boolean } | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["data-sources"],
    queryFn: () => dataSourcesApi.findAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataSourcesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["data-sources"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : data?.length ? (
                data.map((ds) => (
                  <tr key={ds.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ds.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ds.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {ds.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditing({ id: ds.id, name: ds.name, isActive: ds.isActive })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete "${ds.name}"?`)) deleteMutation.mutate(ds.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No data sources found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <DataSourceModal onClose={() => setShowModal(false)} />
      )}

      {editing && (
        <DataSourceModal
          id={editing.id}
          initialName={editing.name}
          initialActive={editing.isActive}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function DataSourceModal({
  id,
  initialName,
  initialActive,
  onClose,
}: {
  id?: string;
  initialName?: string;
  initialActive?: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName || "");
  const [isActive, setIsActive] = useState(initialActive ?? true);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (dto: { name: string; isActive: boolean }) =>
      id ? dataSourcesApi.update(id, dto) : dataSourcesApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-sources"] });
      onClose();
    },
    onError: (e: any) => {
      setError(e.response?.data?.message || "Failed to save");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{id ? "Edit" : "Add"} Data Source</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ name, isActive });
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FACEBOOK"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={mutation.isPending}>Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
