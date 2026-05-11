import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Puzzle, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */
interface CatalogueModule {
  id: string;
  name: string;
  description?: string;
  monthly_price: number;
  status: "active" | "pending" | "inactive" | "rejected";
}

/* ─── Status helpers ────────────────────────────────────────────── */
const STATUS_META: Record<
  CatalogueModule["status"],
  { label: string; colorVar: string; Icon: React.FC<{ className?: string }> }
> = {
  active:   { label: "Active",           colorVar: "--green",            Icon: CheckCircle2 },
  pending:  { label: "Pending Approval", colorVar: "--amber",            Icon: Clock        },
  rejected: { label: "Rejected",         colorVar: "--red",              Icon: XCircle      },
  inactive: { label: "Not Active",       colorVar: "--muted-foreground", Icon: Puzzle       },
};

/* ─── Module card ───────────────────────────────────────────────── */
function ModuleCard({
  module,
  onRequest,
  requesting,
}: {
  module: CatalogueModule;
  onRequest: (id: string) => void;
  requesting: boolean;
}) {
  const meta = STATUS_META[module.status];
  const { Icon } = meta;

  return (
    <div
      className="card-elevated rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden"
      style={
        module.status === "active"
          ? { borderColor: "hsl(var(--green) / 0.25)" }
          : module.status === "pending"
          ? { borderColor: "hsl(var(--amber) / 0.25)", background: "hsl(var(--amber) / 0.02)" }
          : undefined
      }
    >
      {/* Glow orb */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{
          background: `hsl(var(${meta.colorVar}) / 0.4)`,
          transform: "translate(30%, -30%)",
        }}
      />

      {/* Icon + status */}
      <div className="flex items-start justify-between relative">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: `hsl(var(${meta.colorVar}) / 0.1)`,
            border: `1px solid hsl(var(${meta.colorVar}) / 0.25)`,
            color: `hsl(var(${meta.colorVar}))`,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>

        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{
            background: `hsl(var(${meta.colorVar}) / 0.1)`,
            color: `hsl(var(${meta.colorVar}))`,
            border: `1px solid hsl(var(${meta.colorVar}) / 0.2)`,
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Text */}
      <div className="relative flex-1">
        <p className="font-semibold text-foreground leading-tight">{module.name}</p>
        {module.description && (
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
            {module.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        {/* Price badge */}
        <div className="flex items-baseline gap-1">
          <span
            className="font-mono font-bold text-lg"
            style={{ color: "hsl(var(--amber))" }}
          >
            £{module.monthly_price.toFixed(2)}
          </span>
          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>/mo</span>
        </div>

        {/* Action button */}
        {module.status === "active" ? (
          <span
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{
              background: "hsl(var(--green) / 0.1)",
              color: "hsl(var(--green))",
              border: "1px solid hsl(var(--green) / 0.25)",
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
          </span>
        ) : module.status === "pending" ? (
          <span
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{
              background: "hsl(var(--amber) / 0.1)",
              color: "hsl(var(--amber))",
              border: "1px solid hsl(var(--amber) / 0.25)",
            }}
          >
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        ) : (
          <button
            onClick={() => onRequest(module.id)}
            disabled={requesting}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg nav-transition"
            style={{
              background: "hsl(var(--amber) / 0.12)",
              color: "hsl(var(--amber))",
              border: "1px solid hsl(var(--amber) / 0.3)",
              opacity: requesting ? 0.6 : 1,
            }}
          >
            {requesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Puzzle className="w-3.5 h-3.5" />
            )}
            {module.status === "rejected" ? "Request Again" : "Request Access"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function ModuleCatalogue() {
  const [modules, setModules] = useState<CatalogueModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const token = () => localStorage.getItem("access_token");

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modules", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setModules(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleRequest = async (moduleId: string) => {
    setRequestingId(moduleId);
    try {
      const res = await fetch(`/api/modules/${moduleId}/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        // Optimistic update
        setModules((prev) =>
          prev.map((m) => (m.id === moduleId ? { ...m, status: "pending" as const } : m))
        );
      }
    } finally {
      setRequestingId(null);
    }
  };

  const activeCount   = modules.filter((m) => m.status === "active").length;
  const pendingCount  = modules.filter((m) => m.status === "pending").length;
  const availCount    = modules.filter((m) => m.status === "inactive" || m.status === "rejected").length;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in-up">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Puzzle className="w-6 h-6" style={{ color: "hsl(var(--amber))" }} />
              Modules
            </h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Feature add-ons available for your franchise
            </p>
          </div>

          {/* Summary pills */}
          {!loading && modules.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeCount > 0 && (
                <span
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background: "hsl(var(--green) / 0.1)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.2)" }}
                >
                  {activeCount} active
                </span>
              )}
              {pendingCount > 0 && (
                <span
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background: "hsl(var(--amber) / 0.1)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber) / 0.2)" }}
                >
                  {pendingCount} pending
                </span>
              )}
              {availCount > 0 && (
                <span
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ background: "hsl(var(--muted-foreground) / 0.1)", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--muted-foreground) / 0.2)" }}
                >
                  {availCount} available
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-52 rounded-2xl" />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ border: "1px dashed hsl(var(--border))" }}
          >
            <Puzzle className="w-10 h-10 mx-auto mb-4" style={{ color: "hsl(var(--muted-foreground))" }} />
            <p className="font-medium text-foreground">No modules available yet</p>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Your administrator hasn't published any modules. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m) => (
              <ModuleCard
                key={m.id}
                module={m}
                onRequest={handleRequest}
                requesting={requestingId === m.id}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
