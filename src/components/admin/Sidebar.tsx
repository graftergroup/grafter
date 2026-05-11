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
  Wrench,
  UserCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  Star,
  Receipt,
  Banknote,
  Megaphone,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveModules } from "@/hooks/useActiveModules";
import { usePermissions } from "@/hooks/usePermissions";

interface SidebarItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  submenu?: SidebarItem[];
  permissionSlug?: string;
}

const ADMIN_MENU_BASE: SidebarItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, permissionSlug: "dashboard" },
  {
    label: "Revenue",
    icon: DollarSign,
    permissionSlug: "revenue",
    submenu: [
      { label: "Invoices",  href: "/admin/invoices",        icon: DollarSign },
      { label: "Payments",  href: "/admin/payments",        icon: DollarSign },
      { label: "Reports",   href: "/admin/revenue-reports", icon: BarChart3  },
    ],
  },
  { label: "Customers", href: "/admin/customers", icon: Users,    permissionSlug: "customers" },
  { label: "Bookings",  href: "/admin/bookings",  icon: Calendar, permissionSlug: "bookings"  },
  { label: "Vehicles",  href: "/admin/vehicles",  icon: Truck,    permissionSlug: "vehicles"  },
  { label: "Locations", href: "/admin/locations", icon: MapPin,   permissionSlug: "locations" },
  { label: "Settings",  href: "/admin/settings",  icon: Settings, permissionSlug: "settings"  },
];

const TEAM_MENU_BASE: SidebarItem = {
  label: "Team",
  icon: Users,
  permissionSlug: "team",
  submenu: [
    { label: "Technicians", href: "/admin/technicians", icon: Wrench    },
    { label: "Workload",    href: "/admin/workload",    icon: Calendar   },
    { label: "Staff",       href: "/admin/staff",       icon: Users      },
    { label: "Performance", href: "/admin/performance", icon: TrendingUp },
  ],
};

const TEAM_MENU_HR: SidebarItem = {
  label: "Grafter HR",
  icon: UserCheck,
  permissionSlug: "hr",
  submenu: [
    { label: "Employees",      href: "/admin/hr/employees",   icon: Users         },
    { label: "Technicians",    href: "/admin/technicians",    icon: Wrench        },
    { label: "Calendar",       href: "/admin/hr/calendar",    icon: CalendarDays  },
    { label: "Rotas & Shifts", href: "/admin/hr/rotas",       icon: ClipboardList },
    { label: "Documents",      href: "/admin/hr/documents",   icon: FileText      },
    { label: "Performance",    href: "/admin/hr/performance", icon: Star          },
    { label: "Expenses",       href: "/admin/hr/expenses",    icon: Receipt       },
    { label: "Payroll",        href: "/admin/hr/payroll",     icon: Banknote      },
    { label: "Recruitment",    href: "/admin/hr/recruitment", icon: Megaphone     },
  ],
};

export function Sidebar() {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { logout, user } = useAuth();
  const location = useLocation();
  const { hasModule } = useActiveModules();
  const { hasPermission } = usePermissions();

  const isActive = (href?: string) => !!href && location.pathname === href;
  const isGroupActive = (item: SidebarItem) =>
    !!item.submenu?.some((s) => location.pathname.startsWith(s.href ?? "__"));

  const hrActive = hasModule("hr");
  const teamMenu = hrActive ? TEAM_MENU_HR : TEAM_MENU_BASE;

  const fullMenu: SidebarItem[] = [
    ADMIN_MENU_BASE[0],       // Dashboard
    ADMIN_MENU_BASE[1],       // Revenue
    teamMenu,                 // Team (basic) or People (HR)
    ...ADMIN_MENU_BASE.slice(2), // Customers, Bookings, Vehicles, Locations, Modules, Settings
  ].filter((item) => !item.permissionSlug || hasPermission(item.permissionSlug, "view"));

  // Auto-expand the active group on first render
  const activeGroup = fullMenu.find((item) => item.submenu && isGroupActive(item));
  const [initialised, setInitialised] = useState(false);
  if (!initialised && activeGroup) {
    setExpandedMenu(activeGroup.label);
    setInitialised(true);
  }

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
              Franchise Portal
            </p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pt-5 pb-2">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--muted-foreground) / 0.6)", letterSpacing: "0.1em" }}
        >
          Management
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
        {fullMenu.map((item) => {
          const active = isActive(item.href);
          const groupActive = isGroupActive(item);
          const open = expandedMenu === item.label;

          if (item.submenu) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setExpandedMenu(open ? null : item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 h-9 rounded-md text-sm font-medium nav-transition",
                    groupActive
                      ? "text-foreground"
                      : "text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--sidebar-item-hover))]"
                  )}
                  style={groupActive ? { background: "hsl(var(--amber) / 0.08)" } : undefined}
                >
                  <item.icon
                    className={cn("flex-shrink-0 w-4 h-4", groupActive && "text-[hsl(var(--amber))]")}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn("w-3.5 h-3.5 opacity-50 nav-transition", open && "rotate-180")}
                  />
                </button>

                {open && (
                  <div
                    className="mt-0.5 mb-1 ml-3 pl-3 space-y-0.5"
                    style={{ borderLeft: "1px solid hsl(var(--sidebar-border))" }}
                  >
                    {item.submenu.map((sub) => {
                      const subActive = isActive(sub.href);
                      return (
                        <Link
                          key={sub.label}
                          to={sub.href ?? "#"}
                          className={cn(
                            "relative flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm nav-transition",
                            subActive
                              ? "text-foreground font-medium"
                              : "text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--sidebar-item-hover))]"
                          )}
                          style={subActive ? { background: "hsl(var(--amber) / 0.12)" } : undefined}
                        >
                          {subActive && (
                            <span
                              className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                              style={{ background: "hsl(var(--amber))" }}
                            />
                          )}
                          <sub.icon
                            className={cn("flex-shrink-0 w-3.5 h-3.5", subActive && "text-[hsl(var(--amber))]")}
                          />
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.href ?? "#"}
              className={cn(
                "relative flex items-center gap-3 px-3 h-9 rounded-md text-sm font-medium nav-transition",
                active
                  ? "text-foreground"
                  : "text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--sidebar-item-hover))]"
              )}
              style={active ? { background: "hsl(var(--amber) / 0.12)" } : undefined}
            >
              {active && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                  style={{ background: "hsl(var(--amber))" }}
                />
              )}
              <item.icon
                className={cn("flex-shrink-0 w-4 h-4", active && "text-[hsl(var(--amber))]")}
              />
              <span>{item.label}</span>
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
            <p className="text-xs capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>
              {user.role?.replace(/_/g, " ")}
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
