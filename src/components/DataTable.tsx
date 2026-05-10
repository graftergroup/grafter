import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
export interface ColDef<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColDef<T>[];
  data: T[];
  rowKey: keyof T;
  /** placeholder text for built-in search */
  searchPlaceholder?: string;
  /** which string fields to search over */
  searchKeys?: (keyof T)[];
  pageSize?: number;
  emptyText?: string;
  loading?: boolean;
}

/* ─── Status chip ────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { bg: string; text: string; dot?: string }> = {
  active:    { bg: "hsl(var(--green) / 0.12)",  text: "hsl(var(--green))",  dot: "hsl(var(--green))"  },
  inactive:  { bg: "hsl(var(--muted))",          text: "hsl(var(--muted-foreground))" },
  pending:   { bg: "hsl(var(--amber) / 0.12)",   text: "hsl(var(--amber))",  dot: "hsl(var(--amber))"  },
  invoiced:  { bg: "hsl(var(--blue) / 0.12)",    text: "hsl(var(--blue))",   dot: "hsl(var(--blue))"   },
  paid:      { bg: "hsl(var(--green) / 0.12)",   text: "hsl(var(--green))",  dot: "hsl(var(--green))"  },
  confirmed: { bg: "hsl(var(--blue) / 0.12)",    text: "hsl(var(--blue))",   dot: "hsl(var(--blue))"   },
  completed: { bg: "hsl(var(--green) / 0.12)",   text: "hsl(var(--green))",  dot: "hsl(var(--green))"  },
  cancelled: { bg: "hsl(var(--red) / 0.1)",      text: "hsl(var(--red))",    dot: "hsl(var(--red))"    },
  approved:  { bg: "hsl(var(--green) / 0.12)",   text: "hsl(var(--green))",  dot: "hsl(var(--green))"  },
  rejected:  { bg: "hsl(var(--red) / 0.1)",      text: "hsl(var(--red))",    dot: "hsl(var(--red))"    },
  technician:{ bg: "hsl(var(--blue) / 0.12)",    text: "hsl(var(--blue))"    },
  franchise_manager: { bg: "hsl(var(--amber) / 0.12)", text: "hsl(var(--amber))" },
  super_admin: { bg: "hsl(38 90% 48% / 0.15)",   text: "hsl(38 90% 52%)"   },
};

export function StatusChip({ value }: { value: string }) {
  const key = value.toLowerCase().replace(/ /g, "_");
  const style = STATUS_MAP[key] ?? { bg: "hsl(var(--muted))", text: "hsl(var(--muted-foreground))" };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: style.bg, color: style.text }}
    >
      {style.dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: style.dot, boxShadow: `0 0 5px ${style.dot}` }}
        />
      )}
      {value.replace(/_/g, " ")}
    </span>
  );
}

/* ─── Avatar ─────────────────────────────────────────────────── */
export function Avatar({ name, sub }: { name: string; sub?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
        style={{
          background: "hsl(var(--amber) / 0.15)",
          color: "hsl(var(--amber))",
          border: "1px solid hsl(var(--amber) / 0.25)",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        {sub && (
          <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Progress bar ───────────────────────────────────────────── */
export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    pct >= 80 ? "hsl(var(--green))"
    : pct >= 50 ? "hsl(var(--amber))"
    : "hsl(var(--red))";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "hsl(var(--border))" }}
      >
        <div
          className="h-full rounded-full nav-transition"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className="text-xs tabular-nums font-medium w-10 text-right"
        style={{ color, fontFamily: "'DM Mono', monospace" }}
      >
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

/* ─── DataTable ──────────────────────────────────────────────── */
export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  searchPlaceholder = "Search…",
  searchKeys = [],
  pageSize = 12,
  emptyText = "No records found",
  loading = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  /* search */
  const searched = useMemo(() => {
    if (!query.trim() || searchKeys.length === 0) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((k) => String((row as Record<string, unknown>)[k as string] ?? "").toLowerCase().includes(q))
    );
  }, [data, query, searchKeys]);

  /* sort */
  const sorted = useMemo(() => {
    if (!sortKey) return searched;
    return [...searched].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey] ?? "";
      const bv = (b as Record<string, unknown>)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [searched, sortKey, sortDir]);

  /* paginate */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleSearch = (v: string) => {
    setQuery(v);
    setPage(1);
  };

  /* skeleton rows */
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-9 w-64 rounded-lg" />
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid hsl(var(--border))" }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3.5"
              style={{ borderBottom: i < 5 ? "1px solid hsl(var(--border))" : undefined }}
            >
              <div className="skeleton h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 rounded" style={{ width: `${50 + (i % 4) * 10}%` }} />
                <div className="skeleton h-3 rounded w-32" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {searchKeys.length > 0 && (
        <div className="relative w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "hsl(var(--muted-foreground))" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-3 rounded-lg text-sm bg-transparent outline-none
                       placeholder:text-[hsl(var(--muted-foreground))] text-foreground
                       focus:ring-1 focus:ring-[hsl(var(--amber)/0.5)]"
            style={{ border: "1px solid hsl(var(--border))" }}
          />
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden card-elevated"
        style={{ border: "1px solid hsl(var(--border))" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--muted))" }}>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "px-4 py-3 text-left font-medium select-none",
                    col.sortable && "cursor-pointer hover:text-foreground nav-transition",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                  style={{ color: "hsl(var(--muted-foreground))" }}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sortKey === String(col.key) ? (
                        sortDir === "asc"
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-30" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-16 text-sm"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={String((row as Record<string, unknown>)[rowKey as string])}
                  className="group nav-transition"
                  style={{
                    borderBottom: i < paginated.length - 1 ? "1px solid hsl(var(--border))" : undefined,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "hsl(var(--accent))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        "px-4 py-3.5",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key as string] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            {sorted.length} result{sorted.length !== 1 ? "s" : ""}
            {query && ` for "${query}"`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 rounded-md flex items-center justify-center nav-transition
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="w-8 text-center text-xs"
                        style={{ color: "hsl(var(--muted-foreground))" }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-8 rounded-md text-xs font-medium nav-transition",
                      p === safePage
                        ? "text-[hsl(var(--primary-foreground))]"
                        : "text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--accent))]"
                    )}
                    style={
                      p === safePage
                        ? { background: "hsl(var(--amber))", color: "hsl(var(--primary-foreground))" }
                        : undefined
                    }
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 rounded-md flex items-center justify-center nav-transition
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
