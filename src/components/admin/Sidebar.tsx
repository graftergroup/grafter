import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Calendar,
  Truck,
  Settings,
  ChevronDown,
  BarChart3,
  TrendingUp,
  MapPin,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SidebarItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: string;
  submenu?: SidebarItem[];
}

const ADMIN_MENU: SidebarItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    label: "Revenue",
    icon: DollarSign,
    submenu: [
      { label: "Invoices",  href: "/admin/invoices",        icon: DollarSign },
      { label: "Payments",  href: "/admin/payments",        icon: DollarSign },
      { label: "Reports",   href: "/admin/revenue-reports", icon: BarChart3  },
    ],
  },
  {
    label: "Team",
    icon: Users,
    submenu: [
      { label: "Technicians", href: "/admin/technicians", icon: Wrench     },
      { label: "Workload",    href: "/admin/workload",    icon: Calendar    },
      { label: "Staff",       href: "/admin/staff",       icon: Users       },
      { label: "Performance", href: "/admin/performance", icon: TrendingUp  },
    ],
  },
  { label: "Customers", href: "/admin/customers", icon: Users     },
  { label: "Bookings",  href: "/admin/bookings",  icon: Calendar  },
  { label: "Vehicles",  href: "/admin/vehicles",  icon: Truck     },
  { label: "Locations", href: "/admin/locations", icon: MapPin    },
  { label: "Settings",  href: "/admin/settings",  icon: Settings  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { logout, user } = useAuth();
  const location = useLocation();

  const isActive = (href?: string) => href && location.pathname === href;
  const isGroupActive = (item: SidebarItem) =>
    item.submenu?.some((s) => location.pathname === s.href);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen nav-transition flex-shrink-0 overflow-hidden",
        "border-r",
        collapsed ? "w-16" : "w-56"
      )}
      style={{
        background: "hsl(var(--sidebar-bg))",
        borderColor: "hsl(var(--sidebar-border))",
      }}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 flex-shrink-0 nav-transition",
          collapsed ? "justify-center px-0" : "px-4 gap-3"
        )}
        style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
          style={{
            background: "hsl(var(--amber))",
            color: "hsl(var(--primary-foreground))",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          G
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold leading-tight text-foreground truncate">
              Grafter
            </p>
            <p className="text-xs leading-tight" style={{ color: "hsl(var(--muted-foreground))" }}>
              Franchise Portal
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {ADMIN_MENU.map((item) => {
          const active = isActive(item.href);
          const groupActive = isGroupActive(item);
          const open = expandedMenu === item.label;

          if (item.submenu) {
            return (
              <div key={item.label}>
                <button
                  onClick={() =>
                    !collapsed && setExpandedMenu(open ? null : item.label)
                  }
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center rounded-md text-sm font-medium nav-transition relative",
                    collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 h-9 gap-3",
                    groupActive
                      ? "text-foreground"
                      : "hover:bg-[hsl(var(--sidebar-item-hover))]",
                    "text-[hsl(var(--muted-foreground))] hover:text-foreground group"
                  )}
                >
                  {groupActive && (
                    <span
                      className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                      style={{ background: "hsl(var(--amber))" }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "flex-shrink-0 w-4 h-4 nav-transition",
                      groupActive && "text-[hsl(var(--amber))]"
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 nav-transition opacity-50",
                          open && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>

                {!collapsed && open && (
                  <div className="mt-0.5 mb-1 ml-3 pl-4 space-y-0.5"
                    style={{ borderLeft: "1px solid hsl(var(--sidebar-border))" }}
                  >
                    {item.submenu.map((sub) => (
                      <NavLink key={sub.label} item={sub} active={!!isActive(sub.href)} />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.label}
              item={item}
              active={!!active}
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      {/* User + Logout */}
      <div
        className="flex-shrink-0 p-2 space-y-1"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-md" style={{ background: "hsl(var(--accent))" }}>
            <p className="text-xs font-medium text-foreground truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>
              {user.role?.replace(/_/g, " ")}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          title="Logout"
          className={cn(
            "w-full flex items-center rounded-md text-sm nav-transition gap-3",
            "hover:bg-[hsl(var(--sidebar-item-hover))]",
            "text-[hsl(var(--muted-foreground))] hover:text-destructive",
            collapsed ? "justify-center h-10" : "px-3 h-9"
          )}
        >
          <LogOut className="flex-shrink-0 w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => {
          setCollapsed((c) => !c);
          if (!collapsed) setExpandedMenu(null);
        }}
        className={cn(
          "absolute -right-3 top-12 z-10 flex items-center justify-center",
          "w-6 h-6 rounded-full nav-transition",
          "bg-[hsl(var(--card))] border border-[hsl(var(--border))]",
          "text-[hsl(var(--muted-foreground))] hover:text-foreground hover:border-[hsl(var(--amber))]"
        )}
      >
        {collapsed ? (
          <ChevronsRight className="w-3 h-3" />
        ) : (
          <ChevronsLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}

interface NavLinkProps {
  item: SidebarItem;
  active: boolean;
  collapsed?: boolean;
}

function NavLink({ item, active, collapsed }: NavLinkProps) {
  return (
    <Link
      to={item.href || "#"}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center rounded-md text-sm font-medium nav-transition",
        collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 h-9 gap-3",
        active
          ? "text-foreground sidebar-active-glow"
          : "text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--sidebar-item-hover))]"
      )}
      style={
        active
          ? { background: "hsl(var(--amber) / 0.12)", borderLeft: collapsed ? "none" : "none" }
          : undefined
      }
    >
      {active && !collapsed && (
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
          style={{ background: "hsl(var(--amber))" }}
        />
      )}
      <item.icon
        className={cn(
          "flex-shrink-0 w-4 h-4",
          active && "text-[hsl(var(--amber))]"
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="pill-badge">{item.badge}</span>
          )}
        </>
      )}
    </Link>
  );
}
