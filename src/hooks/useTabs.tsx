import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* ─── Route label map (static routes) ─────────────────────────── */
const ROUTE_LABELS: Record<string, string> = {
  // Admin
  "/admin":                  "Dashboard",
  "/admin/invoices":         "Invoices",
  "/admin/payments":         "Payments",
  "/admin/revenue-reports":  "Reports",
  "/admin/technicians":      "Technicians",
  "/admin/workload":         "Workload",
  "/admin/staff":            "Staff",
  "/admin/performance":      "Performance",
  "/admin/customers":        "Customers",
  "/admin/bookings":         "Bookings",
  "/admin/vehicles":         "Vehicles",
  "/admin/locations":        "Locations",
  "/admin/settings":         "Settings",
  // Superadmin
  "/superadmin":             "Overview",
  "/superadmin/franchises":  "Franchises",
  "/superadmin/staff":       "All Staff",
  "/superadmin/billing":     "Billing",
};

/* ─── Types ────────────────────────────────────────────────────── */
export interface Tab {
  path: string;
  label: string;
}

interface TabContextValue {
  tabs: Tab[];
  closeTab: (path: string) => void;
  closeAll: () => void;
  /** Register a dynamic route with a custom label (e.g. franchise detail pages) */
  registerTab: (path: string, label: string) => void;
}

/* ─── Context ──────────────────────────────────────────────────── */
const TabContext = createContext<TabContextValue>({
  tabs: [],
  closeTab: () => {},
  closeAll: () => {},
  registerTab: () => {},
});

export function useTabContext() {
  return useContext(TabContext);
}

/* ─── Provider ─────────────────────────────────────────────────── */
export function TabProvider({
  children,
  homeRoute,
}: {
  children: React.ReactNode;
  homeRoute: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<Tab[]>([]);

  // Auto-add current route as a tab whenever location changes (static routes only).
  // Dynamic routes (e.g. /superadmin/franchises/:id) use registerTab() instead.
  useEffect(() => {
    const path = location.pathname;
    const label = ROUTE_LABELS[path];
    if (!label) return;

    setTabs((prev) => {
      if (prev.some((t) => t.path === path)) return prev;
      return [...prev, { path, label }];
    });
  }, [location.pathname]);

  /** Called by dynamic pages (e.g. FranchiseDetail, StaffDetail) once they know their label */
  const registerTab = useCallback((path: string, label: string) => {
    setTabs((prev) => {
      const existing = prev.find((t) => t.path === path);
      if (existing) {
        // Update label if it changed (e.g. name loaded async)
        if (existing.label === label) return prev;
        return prev.map((t) => (t.path === path ? { ...t, label } : t));
      }
      return [...prev, { path, label }];
    });
  }, []);

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.path === path);
        const next = prev.filter((t) => t.path !== path);

        if (path === location.pathname) {
          const target = next[Math.max(0, idx - 1)]?.path ?? homeRoute;
          navigate(target);
        }
        return next;
      });
    },
    [location.pathname, navigate, homeRoute]
  );

  const closeAll = useCallback(() => {
    setTabs([]);
    navigate(homeRoute);
  }, [navigate, homeRoute]);

  return (
    <TabContext.Provider value={{ tabs, closeTab, closeAll, registerTab }}>
      {children}
    </TabContext.Provider>
  );
}
