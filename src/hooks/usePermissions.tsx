import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { PermissionEntry, PermissionAction } from "@/types";
import { useAuth } from "@/hooks/useAuth";

/** Roles that bypass all permission checks — always full access */
const BYPASS_ROLES = new Set(["super_admin", "admin", "franchise_manager"]);

interface PermissionsContextType {
  permissions: PermissionEntry[];
  isLoading: boolean;
  hasPermission: (slug: string, action?: PermissionAction) => boolean;
  refetch: () => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuth();
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!user || !accessToken) return;
    // Bypass roles don't need a fetch — they get full access
    if (BYPASS_ROLES.has(user.role)) {
      setPermissions([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff/me/permissions", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data: PermissionEntry[] = await res.json();
        setPermissions(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, accessToken]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (slug: string, action: PermissionAction = "view"): boolean => {
      if (!user) return false;
      // Bypass roles always have full access
      if (BYPASS_ROLES.has(user.role)) return true;
      const entry = permissions.find((p) => p.permission_slug === slug);
      if (!entry) return false;
      switch (action) {
        case "view":   return entry.can_view;
        case "create": return entry.can_create;
        case "update": return entry.can_update;
        case "delete": return entry.can_delete;
        default:       return false;
      }
    },
    [user, permissions]
  );

  return (
    <PermissionsContext.Provider value={{ permissions, isLoading, hasPermission, refetch: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}
