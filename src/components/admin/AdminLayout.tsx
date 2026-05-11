import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/admin/Sidebar";
import { TabBar } from "@/components/TabBar";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { ChevronRight } from "lucide-react";

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
            <NotificationBell />

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
