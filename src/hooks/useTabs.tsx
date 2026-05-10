import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* ─── Route label map ──────────────────────────────────────────── */
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
}

/* ─── Context ──────────────────────────────────────────────────── */
const TabContext = createContext<TabContextValue>({
  tabs: [],
  closeTab: () => {},
  closeAll: () => {},
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

  // Auto-add current route as a tab whenever location changes
  useEffect(() => {
    const path = location.pathname;
    const label = ROUTE_LABELS[path];
    if (!label) return; // ignore unknown routes

    setTabs((prev) => {
      if (prev.some((t) => t.path === path)) return prev; // already open
      return [...prev, { path, label }];
    });
  }, [location.pathname]);

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.path === path);
        const next = prev.filter((t) => t.path !== path);

        // If we closed the active tab, navigate to adjacent or home
        if (path === location.pathname) {
          const target =
            next[Math.max(0, idx - 1)]?.path ?? homeRoute;
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
    <TabContext.Provider value={{ tabs, closeTab, closeAll }}>
      {children}
    </TabContext.Provider>
  );
}
