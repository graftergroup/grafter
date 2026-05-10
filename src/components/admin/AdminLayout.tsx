import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/admin/Sidebar";
import { TabProvider } from "@/hooks/useTabs";
import { TabBar } from "@/components/TabBar";
import { Bell, ChevronRight } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const ROUTE_MAP: Record<string, string[]> = {
  "/admin":                  ["Dashboard"],
  "/admin/invoices":         ["Revenue", "Invoices"],
  "/admin/payments":         ["Revenue", "Payments"],
  "/admin/revenue-reports":  ["Revenue", "Reports"],
  "/admin/technicians":      ["Team", "Technicians"],
  "/admin/workload":         ["Team", "Workload"],
  "/admin/staff":            ["Team", "Staff"],
  "/admin/performance":      ["Team", "Performance"],
  "/admin/customers":        ["Customers"],
  "/admin/bookings":         ["Bookings"],
  "/admin/vehicles":         ["Vehicles"],
  "/admin/locations":        ["Locations"],
  "/admin/settings":         ["Settings"],
};

function AdminLayoutInner({ children, title, description }: AdminLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const crumbs = ROUTE_MAP[location.pathname] ?? [title];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="topbar-glass h-14 flex-shrink-0 flex items-center justify-between px-6 z-10">
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
            <button
              className="relative w-8 h-8 rounded-md flex items-center justify-center nav-transition
                         text-[hsl(var(--muted-foreground))] hover:text-foreground
                         hover:bg-[hsl(var(--accent))]"
            >
              <Bell className="w-4 h-4" />
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--amber))" }}
              />
            </button>

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
                <div className="hidden sm:block text-right leading-tight">
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

export function AdminLayout(props: AdminLayoutProps) {
  return (
    <TabProvider homeRoute="/admin">
      <AdminLayoutInner {...props} />
    </TabProvider>
  );
}
