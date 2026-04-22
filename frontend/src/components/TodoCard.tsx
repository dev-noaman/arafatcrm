import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todosApi } from "@/api/todos";
import { Card } from "@/components/ui";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";

export default function TodoCard() {
  const queryClient = useQueryClient();
  const [newText, setNewText] = useState("");

  const { data: todos = [] } = useQuery({
    queryKey: ["todos"],
    queryFn: () => todosApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (text: string) => todosApi.create(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setNewText("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      todosApi.update(id, { isCompleted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => todosApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (trimmed) createMutation.mutate(trimmed);
  };

  return (
    <Card title="My Tasks">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task..."
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-1">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 group"
          >
            <button
              onClick={() => toggleMutation.mutate({ id: todo.id, isCompleted: !todo.isCompleted })}
              className="shrink-0"
            >
              {todo.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" />
              )}
            </button>
            <span
              className={`flex-1 text-sm ${
                todo.isCompleted ? "line-through text-gray-400" : "text-gray-700"
              }`}
            >
              {todo.text}
            </span>
            <button
              onClick={() => deleteMutation.mutate(todo.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
            </button>
          </div>
        ))}
        {todos.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No tasks yet. Add one above.</p>
        )}
      </div>
    </Card>
  );
}
