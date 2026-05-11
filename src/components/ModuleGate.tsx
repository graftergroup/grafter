import { Puzzle, Loader2 } from "lucide-react";
import { useActiveModules } from "@/hooks/useActiveModules";

interface ModuleGateProps {
  /** The module slug to check (e.g. "hr", "payroll") */
  slug: string;
  /** Display name shown in the locked state */
  moduleName?: string;
  children: React.ReactNode;
}

export function ModuleGate({ slug, moduleName, children }: ModuleGateProps) {
  const { hasModule, modules, loading } = useActiveModules();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
      </div>
    );
  }

  if (hasModule(slug)) {
    return <>{children}</>;
  }

  // Find module metadata for the upsell card
  const mod = modules.find((m) => m.slug === slug);
  const displayName = moduleName ?? mod?.module_name ?? slug;
  const isPending = mod?.status === "pending";

  const handleRequest = async () => {
    if (!mod) return;
    const token = localStorage.getItem("access_token");
    await fetch(`/api/modules/${mod.module_id}/request`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center relative overflow-hidden"
        style={{
          background: "hsl(var(--sidebar-bg))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, hsl(var(--amber) / 0.08) 0%, transparent 70%)",
          }}
        />

        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{
            background: "hsl(var(--amber) / 0.1)",
            border: "1px solid hsl(var(--amber) / 0.3)",
            color: "hsl(var(--amber))",
          }}
        >
          <Puzzle className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">{displayName}</h2>
        <p className="text-sm mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          This feature requires the <strong className="text-foreground">{displayName}</strong> module.
        </p>

        {mod && (
          <p className="text-sm mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>
            {mod.effective_price > 0
              ? `£${mod.effective_price.toFixed(2)}/month`
              : "Contact your administrator for pricing."}
          </p>
        )}

        {!mod && (
          <p className="text-sm mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>
            Contact your administrator to enable this module.
          </p>
        )}

        {isPending ? (
          <span
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium"
            style={{
              background: "hsl(var(--amber) / 0.1)",
              color: "hsl(var(--amber))",
              border: "1px solid hsl(var(--amber) / 0.3)",
            }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Pending Approval
          </span>
        ) : mod && mod.status === "inactive" ? (
          <button
            onClick={handleRequest}
            className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg font-medium nav-transition"
            style={{
              background: "hsl(var(--amber))",
              color: "hsl(222 25% 8%)",
            }}
          >
            <Puzzle className="w-4 h-4" />
            Request Access
          </button>
        ) : null}
      </div>
    </div>
  );
}
