import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Calendar,
  Truck,
  Settings,
  ChevronDown,
  ChevronRight,
  BarChart3,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SidebarItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  submenu?: SidebarItem[];
}

const ADMIN_MENU: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Revenue",
    icon: DollarSign,
    submenu: [
      { label: "Invoices", href: "/admin/invoices", icon: DollarSign },
      { label: "Payments", href: "/admin/payments", icon: DollarSign },
      { label: "Reports", href: "/admin/revenue-reports", icon: BarChart3 },
    ],
  },
  {
    label: "Team",
    icon: Users,
    submenu: [
      { label: "Technicians", href: "/admin/technicians", icon: Users },
      { label: "Workload", href: "/admin/workload", icon: Calendar },
      { label: "Staff", href: "/admin/staff", icon: Users },
      { label: "Performance", href: "/admin/performance", icon: TrendingUp },
    ],
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    label: "Bookings",
    href: "/admin/bookings",
    icon: Calendar,
  },
  {
    label: "Vehicles",
    href: "/admin/vehicles",
    icon: Truck,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border h-screen overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Grafter Admin</h2>
        <p className="text-xs text-muted-foreground">Franchise Dashboard</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {ADMIN_MENU.map((item) => (
          <SidebarItemComponent
            key={item.label}
            item={item}
            expanded={expandedMenu === item.label}
            onExpand={(label) =>
              setExpandedMenu(expandedMenu === label ? null : label)
            }
            isActive={location.pathname === item.href}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

interface SidebarItemComponentProps {
  item: SidebarItem;
  expanded: boolean;
  onExpand: (label: string) => void;
  isActive: boolean;
}

function SidebarItemComponent({
  item,
  expanded,
  onExpand,
  isActive,
}: SidebarItemComponentProps) {
  const Icon = item.icon;

  if (item.submenu) {
    return (
      <div>
        <button
          onClick={() => onExpand(item.label)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {item.label}
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {expanded && (
          <div className="mt-1 space-y-1 pl-4 border-l border-border">
            {item.submenu.map((subitem) => (
              <SidebarLink key={subitem.label} item={subitem} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <SidebarLink item={item} isActive={isActive} />;
}

interface SidebarLinkProps {
  item: SidebarItem;
  isActive?: boolean;
}

function SidebarLink({ item, isActive }: SidebarLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      to={item.href || "#"}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
