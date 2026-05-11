import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Building2, Users, LogOut, CreditCard, LayoutGrid, Shield, Puzzle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/superadmin",            label: "Overview",   icon: LayoutGrid },
  { href: "/superadmin/franchises", label: "Franchises", icon: Building2  },
  { href: "/superadmin/staff",      label: "All Staff",  icon: Users      },
  { href: "/superadmin/billing",    label: "Billing",    icon: CreditCard },
  { href: "/superadmin/modules",    label: "Modules",    icon: Puzzle     },
];

export function SuperadminSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-screen"
      style={{
        background: "hsl(var(--sidebar-bg))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Brand */}
      <div
        className="h-14 flex items-center gap-3 px-4 flex-shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, hsl(var(--amber)), hsl(38 90% 48%))",
            color: "hsl(var(--primary-foreground))",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          G
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">Grafter</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Shield className="w-2.5 h-2.5" style={{ color: "hsl(var(--amber))" }} />
            <p className="text-xs leading-tight" style={{ color: "hsl(var(--amber))" }}>
              Super Admin
            </p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-xs font-semibold tracking-widest uppercase"
           style={{ color: "hsl(var(--muted-foreground) / 0.6)", letterSpacing: "0.1em" }}>
          Platform
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "relative flex items-center gap-3 px-3 h-9 rounded-md text-sm font-medium nav-transition",
                active
                  ? "text-foreground"
                  : "text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--sidebar-item-hover))]"
              )}
              style={
                active
                  ? { background: "hsl(var(--amber) / 0.12)" }
                  : undefined
              }
            >
              {active && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                  style={{ background: "hsl(var(--amber))" }}
                />
              )}
              <Icon
                className={cn(
                  "flex-shrink-0 w-4 h-4",
                  active ? "text-[hsl(var(--amber))]" : ""
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div
        className="flex-shrink-0 p-2 space-y-1"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        {user && (
          <div className="px-3 py-2 rounded-md mb-1" style={{ background: "hsl(var(--accent))" }}>
            <p className="text-xs font-medium text-foreground truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Super Admin
            </p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 h-9 rounded-md text-sm nav-transition
                     text-[hsl(var(--muted-foreground))] hover:text-destructive
                     hover:bg-[hsl(var(--sidebar-item-hover))]"
        >
          <LogOut className="flex-shrink-0 w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
