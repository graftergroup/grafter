import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/admin/Sidebar";
import { TabBar } from "@/components/TabBar";
import { Bell, ChevronRight, AlertTriangle, FileText, X } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const ROUTE_MAP: Record<string, string[]> = {
  "/admin":                    ["Dashboard"],
  "/admin/invoices":           ["Revenue", "Invoices"],
  "/admin/payments":           ["Revenue", "Payments"],
  "/admin/revenue-reports":    ["Revenue", "Reports"],
  "/admin/technicians":        ["Team", "Technicians"],
  "/admin/workload":           ["Team", "Workload"],
  "/admin/staff":              ["Team", "Staff"],
  "/admin/performance":        ["Team", "Performance"],
  "/admin/customers":          ["Customers"],
  "/admin/bookings":           ["Bookings"],
  "/admin/vehicles":           ["Vehicles"],
  "/admin/locations":          ["Locations"],
  "/admin/modules":            ["Settings", "Modules"],
  "/admin/settings":           ["Settings"],
  "/admin/hr/employees":       ["Grafter HR", "Employees"],
  "/admin/hr/calendar":        ["Grafter HR", "Calendar"],
  "/admin/hr/rotas":           ["Grafter HR", "Rotas & Shifts"],
  "/admin/hr/documents":       ["Grafter HR", "Documents"],
  "/admin/hr/performance":     ["Grafter HR", "Performance"],
  "/admin/hr/expenses":        ["Grafter HR", "Expenses"],
  "/admin/hr/payroll":         ["Grafter HR", "Payroll"],
  "/admin/hr/recruitment":     ["Grafter HR", "Recruitment"],
};

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Expiry notifications ───────────────────────────────────────
  interface ExpiryDoc { id: string; title: string; employee_name: string; employee_id: string; expiry_date: string; days_until_expiry: number; expiry_status: string; }
  const [expiryDocs, setExpiryDocs] = useState<ExpiryDoc[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/hr/documents/expiring?days=90", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data: ExpiryDoc[]) => setExpiryDocs(Array.isArray(data) ? data : []))
      .catch(() => {/* silent — HR module may not be active */});
  }, [location.pathname]);

  // Close bell on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    if (bellOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  const criticalCount = expiryDocs.filter((d) => d.expiry_status === "expired" || d.expiry_status === "critical").length;
  const totalCount = expiryDocs.length;

  // Dynamic crumbs: prefer ROUTE_MAP, fall back to title, then path segments
  const crumbs = (() => {
    if (ROUTE_MAP[location.pathname]) return ROUTE_MAP[location.pathname];
    // employee detail e.g. /admin/hr/employees/:id
    if (location.pathname.startsWith("/admin/hr/employees/")) return ["Grafter HR", "Employees", title ?? "Employee"];
    if (location.pathname.startsWith("/admin/staff/")) return ["Team", "Staff", title ?? "Staff Member"];
    if (location.pathname.startsWith("/admin/invoices/")) return ["Revenue", "Invoice"];
    return title ? [title] : ["Admin"];
  })();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-14 flex-shrink-0 flex items-center justify-between px-6 z-10"
          style={{
            background: "hsl(var(--sidebar-bg))",
            borderBottom: "1px solid hsl(var(--sidebar-border))",
          }}
        >
          <nav className="flex items-center gap-1.5 text-sm">
            {crumbs.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1.5">
                {i > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                )}
                <span
                  className={
                    i === crumbs.length - 1
                      ? "font-semibold text-foreground"
                      : "text-[hsl(var(--muted-foreground))]"
                  }
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative w-8 h-8 rounded-md flex items-center justify-center nav-transition
                           text-[hsl(var(--muted-foreground))] hover:text-foreground
                           hover:bg-[hsl(var(--accent))]"
              >
                <Bell className="w-4 h-4" />
                {totalCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-bold px-1"
                    style={{
                      background: criticalCount > 0 ? "hsl(var(--red))" : "hsl(var(--amber))",
                      color: criticalCount > 0 ? "white" : "hsl(222 25% 8%)",
                    }}
                  >
                    {totalCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {bellOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 16px 48px hsl(0 0% 0% / 0.5)",
                  }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">Document Alerts</span>
                    <button onClick={() => setBellOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {expiryDocs.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No documents expiring in the next 90 days.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-border">
                      {expiryDocs.map((doc) => {
                        const isUrgent = doc.expiry_status === "expired" || doc.expiry_status === "critical";
                        const color = isUrgent ? "--red" : "--amber";
                        const label = doc.expiry_status === "expired"
                          ? `Expired ${Math.abs(doc.days_until_expiry)}d ago`
                          : `${doc.days_until_expiry}d left`;
                        return (
                          <button
                            key={doc.id}
                            className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                            onClick={() => {
                              navigate(`/admin/hr/employees/${doc.employee_id}`);
                              setBellOpen(false);
                            }}
                          >
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: `hsl(var(${color})/0.12)`, border: `1px solid hsl(var(${color})/0.25)` }}>
                              <AlertTriangle className="w-3.5 h-3.5" style={{ color: `hsl(var(${color}))` }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{doc.employee_name}</p>
                              <p className="text-xs font-medium mt-0.5" style={{ color: `hsl(var(${color}))` }}>{label}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {expiryDocs.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border">
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => { navigate("/admin/hr/employees"); setBellOpen(false); }}
                      >
                        View all employees →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {user && (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{
                    background: "hsl(var(--amber) / 0.18)",
                    color: "hsl(var(--amber))",
                    border: "1px solid hsl(var(--amber) / 0.3)",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </div>
                <div className="hidden sm:block leading-tight">
                  <p className="text-xs font-medium text-foreground">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {user.role?.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Tab bar */}
        <TabBar />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in-up">
            {description && (
              <p className="text-sm mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>
                {description}
              </p>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
