import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SuperadminSidebar } from "./SuperadminSidebar";
import { TabProvider } from "@/hooks/useTabs";
import { TabBar } from "@/components/TabBar";
import { ChevronRight, Bell, Shield } from "lucide-react";

const ROUTE_MAP: Record<string, string[]> = {
  "/superadmin":             ["Overview"],
  "/superadmin/franchises":  ["Franchises"],
  "/superadmin/staff":       ["All Staff"],
  "/superadmin/billing":     ["Billing"],
};

function SuperadminLayoutInner({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const crumbs = ROUTE_MAP[location.pathname] ?? ["Platform Admin"];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SuperadminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="topbar-glass h-14 flex-shrink-0 flex items-center justify-between px-6 z-10">
          <nav className="flex items-center gap-1.5 text-sm">
            <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
              <Shield className="w-3.5 h-3.5" style={{ color: "hsl(var(--amber))" }} />
              <span>Platform</span>
            </span>
            {crumbs.map((crumb) => (
              <span key={crumb} className="flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                <span className="font-semibold text-foreground">{crumb}</span>
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
            </button>

            {user && (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
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
                  <p className="text-xs" style={{ color: "hsl(var(--amber))" }}>
                    Super Admin
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Tab bar */}
        <TabBar />

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function SuperadminLayout({ children }: { children: ReactNode }) {
  return (
    <TabProvider homeRoute="/superadmin">
      <SuperadminLayoutInner>{children}</SuperadminLayoutInner>
    </TabProvider>
  );
}
