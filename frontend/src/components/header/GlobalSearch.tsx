import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients";
import { dealsApi } from "@/api/deals";

interface SearchResult {
  type: "client" | "deal";
  id: string;
  label: string;
  sub: string;
  path: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: clientsData } = useQuery({
    queryKey: ["clients", "search"],
    queryFn: () => clientsApi.findAll(1, 500),
    enabled: open,
  });

  const { data: dealsData } = useQuery({
    queryKey: ["deals", "search"],
    queryFn: () => dealsApi.findAll(1, 500),
    enabled: open,
  });

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIdx(-1);
      return;
    }
    const q = query.toLowerCase();
    const found: SearchResult[] = [];

    (clientsData?.data || []).forEach((c: any) => {
      if (c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) {
        found.push({ type: "client", id: c.id, label: c.name, sub: c.email, path: "/clients" });
      }
    });

    (dealsData?.data || []).forEach((d: any) => {
      if (
        d.title?.toLowerCase().includes(q) ||
        d.client?.name?.toLowerCase().includes(q) ||
        d.location?.toLowerCase().includes(q)
      ) {
        found.push({
          type: "deal",
          id: d.id,
          label: d.title,
          sub: `${d.client?.name || ""} · QAR ${d.value?.toLocaleString()}`,
          path: "/deals",
        });
      }
    });

    setResults(found.slice(0, 10));
    setSelectedIdx(-1);
  }, [query, clientsData, dealsData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIdx >= 0 && results[selectedIdx]) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
          <svg className="fill-gray-500 dark:fill-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
              fill=""
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search clients, deals..."
          className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-3 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 xl:w-[430px]"
        />
        <button className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          <span>Ctrl</span>
          <span>K</span>
        </button>
      </div>

      {open && query.trim() && (
        <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-lg border border-gray-200 shadow-xl z-[99999] max-h-80 overflow-auto dark:bg-gray-900 dark:border-gray-800">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">No results for "{query}"</div>
          ) : (
            <div className="py-1">
              {results.map((r, idx) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                    idx === selectedIdx ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    r.type === "client" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {r.type === "client" ? "C" : "D"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.label}</p>
                    <p className="text-xs text-gray-500 truncate">{r.sub}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase flex-shrink-0">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
