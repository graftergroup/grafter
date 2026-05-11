import { createContext, useContext, useState, useEffect, useCallback } from "react";

/* ─── Types ─────────────────────────────────────────────────────── */
interface ActiveModule {
  id: string;
  module_id: string;
  module_name: string;
  module_slug: string;
  status: "active" | "pending" | "inactive" | "rejected";
  effective_price: number;
}

interface ActiveModulesContextValue {
  modules: ActiveModule[];
  loading: boolean;
  hasModule: (slug: string) => boolean;
  refresh: () => void;
}

/* ─── Context ───────────────────────────────────────────────────── */
const ActiveModulesContext = createContext<ActiveModulesContextValue>({
  modules: [],
  loading: true,
  hasModule: () => false,
  refresh: () => {},
});

/* ─── Provider ──────────────────────────────────────────────────── */
export function ActiveModulesProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<ActiveModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_modules = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch("/api/modules", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      }
    } catch {
      // silently fail — non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_modules();
  }, [fetch_modules]);

  const hasModule = useCallback(
    (slug: string) => modules.some((m) => m.module_slug === slug && m.status === "active"),
    [modules]
  );

  return (
    <ActiveModulesContext.Provider value={{ modules, loading, hasModule, refresh: fetch_modules }}>
      {children}
    </ActiveModulesContext.Provider>
  );
}

/* ─── Hook ──────────────────────────────────────────────────────── */
export function useActiveModules() {
  return useContext(ActiveModulesContext);
}
