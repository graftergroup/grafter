import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, X, AlertTriangle, Info, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  category: string;
  severity: "critical" | "warning" | "info";
  title: string;
  subtitle: string;
  action_label: string;
  action_url: string;
  timestamp: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "--red",
  warning:  "--amber",
  info:     "--blue",
};

const CATEGORY_ORDER = [
  "Documents", "Leave", "Expenses", "Revenue", "Bookings", "Modules",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const bellRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const token = () => localStorage.getItem("access_token");

  const fetchNotifications = useCallback(async () => {
    const t = token();
    if (!t) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch {
      /* silent — bell should never break the app */
    }
  }, []);

  // Fetch on every page navigation
  useEffect(() => { fetchNotifications(); }, [location.pathname, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Derived counts
  const criticalCount = notifications.filter((n) => n.severity === "critical").length;
  const totalCount = notifications.length;

  // Categories present in current notifications
  const categories = CATEGORY_ORDER.filter((c) =>
    notifications.some((n) => n.category === c)
  );

  // Filtered list
  const filtered = activeFilter
    ? notifications.filter((n) => n.category === activeFilter)
    : notifications;

  const handleNavigate = (url: string) => {
    navigate(url);
    setOpen(false);
  };

  return (
    <div ref={bellRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 rounded-md flex items-center justify-center nav-transition
                   text-[hsl(var(--muted-foreground))] hover:text-foreground
                   hover:bg-[hsl(var(--accent))]"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {totalCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-bold px-1 leading-none"
            style={{
              background: criticalCount > 0 ? "hsl(var(--red))" : "hsl(var(--amber))",
              color: criticalCount > 0 ? "white" : "hsl(222 25% 8%)",
            }}
          >
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-96 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 20px 60px hsl(0 0% 0% / 0.55)",
            maxHeight: "calc(100vh - 80px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {totalCount > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: criticalCount > 0 ? "hsl(var(--red)/0.15)" : "hsl(var(--amber)/0.15)",
                    color: criticalCount > 0 ? "hsl(var(--red))" : "hsl(var(--amber))",
                  }}
                >
                  {totalCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Category filter pills */}
          {categories.length > 1 && (
            <div className="flex gap-1.5 px-4 py-2 border-b border-border overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveFilter(null)}
                className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors shrink-0"
                style={!activeFilter
                  ? { background: "hsl(var(--amber)/0.15)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber)/0.3)" }
                  : { background: "transparent", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                }
              >
                All
              </button>
              {categories.map((cat) => {
                const catNotifs = notifications.filter((n) => n.category === cat);
                const hasCritical = catNotifs.some((n) => n.severity === "critical");
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1"
                    style={activeFilter === cat
                      ? { background: "hsl(var(--amber)/0.15)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber)/0.3)" }
                      : { background: "transparent", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                    }
                  >
                    {hasCritical && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--red))" }} />}
                    {cat}
                    <span className="opacity-60">({catNotifs.length})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Notification list */}
          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                <Bell className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {totalCount === 0 ? "You're all caught up!" : "No notifications in this category."}
                </p>
              </div>
            ) : (
              filtered.map((n) => {
                const color = SEVERITY_COLORS[n.severity] ?? "--muted-foreground";
                const Icon = n.severity === "info" ? Info : AlertTriangle;
                return (
                  <button
                    key={n.id}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors group"
                    onClick={() => handleNavigate(n.action_url)}
                  >
                    {/* Icon */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: `hsl(var(${color})/0.12)`,
                        border: `1px solid hsl(var(${color})/0.25)`,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: `hsl(var(${color}))` }} />
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground leading-snug">{n.title}</p>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                          style={{
                            background: `hsl(var(${color})/0.12)`,
                            color: `hsl(var(${color}))`,
                          }}
                        >
                          {n.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.subtitle}</p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground mt-1 shrink-0 transition-colors" />
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {totalCount > 0 && (
            <div className="px-4 py-2.5 border-t border-border shrink-0 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {criticalCount > 0 && (
                  <span style={{ color: "hsl(var(--red))" }}>{criticalCount} urgent · </span>
                )}
                {totalCount} total alert{totalCount !== 1 ? "s" : ""}
              </span>
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={fetchNotifications}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
