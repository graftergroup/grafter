import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Building2, Users, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function SuperadminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Grafter</h2>
        <p className="text-xs text-muted-foreground mt-1">Platform Admin</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Link
          to="/superadmin"
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            isActive("/superadmin")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Building2 className="w-4 h-4" />
          Dashboard
        </Link>

        <Link
          to="/superadmin/franchises"
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            isActive("/superadmin/franchises")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Building2 className="w-4 h-4" />
          Franchises
        </Link>

        <Link
          to="/superadmin/staff"
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            isActive("/superadmin/staff")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Users className="w-4 h-4" />
          All Staff
        </Link>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={logout}
          variant="ghost"
          className="w-full flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
