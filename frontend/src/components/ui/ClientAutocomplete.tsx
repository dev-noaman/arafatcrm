import { useState, useRef, useEffect } from "react";

interface ClientOption {
  id: string;
  name: string;
  phone: string | null;
  email: string;
}

interface ClientAutocompleteProps {
  clients: ClientOption[];
  value: string;
  onChange: (clientId: string) => void;
  onNewClient?: () => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export function ClientAutocomplete({ clients, value, onChange, onNewClient, label, required, error }: ClientAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = clients.find((c) => c.id === value);

  const filtered = query.trim()
    ? clients.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
        );
      })
    : clients;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) setIdx(-1);
  }, [open]);

  useEffect(() => {
    if (idx >= 0 && listRef.current) {
      const el = listRef.current.children[idx] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [idx]);

  const handleSelect = (client: ClientOption) => {
    onChange(client.id);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((prev) => Math.min(prev + 1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && idx >= 0 && idx < filtered.length) {
      e.preventDefault();
      handleSelect(filtered[idx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{selected.name}</p>
            <p className="text-xs text-gray-500 truncate">{selected.phone || selected.email}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-0.5 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
            aria-label="Clear"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363Z" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setIdx(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or phone..."
            className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? "border-red-300" : "border-gray-300"
            }`}
          />
        </div>
      )}

      {open && !selected && (
        <div className="relative">
          <ul
            ref={listRef}
            className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-52 overflow-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">
                No clients found
                {onNewClient && (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); onNewClient(); }}
                    className="block w-full mt-1 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Create new client
                  </button>
                )}
              </li>
            ) : (
              <>
                {filtered.map((c, i) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                        i === idx ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {c.name?.charAt(0).toUpperCase() || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 truncate">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                      </div>
                    </button>
                  </li>
                ))}
                {onNewClient && (
                  <li className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => { setOpen(false); onNewClient(); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50 transition-colors"
                    >
                      + Create new client
                    </button>
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
