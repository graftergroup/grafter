import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Settings, Building2, Globe, Mail, Phone, MapPin,
  Save, CheckCircle, Puzzle, CheckCircle2, Clock, XCircle, Loader2,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────── */
interface FranchiseProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_active: boolean;
}

interface CatalogueModule {
  id: string;
  module_name: string;
  module_description?: string;
  effective_price: number;
  module_slug: string;
  status: "active" | "pending" | "inactive" | "rejected";
}

/* ─── Tab def ────────────────────────────────────────────────────── */
type Tab = "general" | "modules";

/* ─── Module status config ───────────────────────────────────────── */
const STATUS_META: Record<CatalogueModule["status"], {
  label: string; colorVar: string; Icon: React.FC<{ className?: string }>;
}> = {
  active:   { label: "Active",           colorVar: "--green",            Icon: CheckCircle2 },
  pending:  { label: "Pending Approval", colorVar: "--amber",            Icon: Clock        },
  rejected: { label: "Rejected",         colorVar: "--red",              Icon: XCircle      },
  inactive: { label: "Not Active",       colorVar: "--muted-foreground", Icon: Puzzle       },
};

/* ─── Module card ────────────────────────────────────────────────── */
function ModuleCard({
  module, onRequest, requesting,
}: {
  module: CatalogueModule;
  onRequest: (id: string) => void;
  requesting: boolean;
}) {
  const meta = STATUS_META[module.status];
  const { Icon } = meta;

  return (
    <div
      className="card-elevated rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
      style={
        module.status === "active"
          ? { border: "1px solid hsl(var(--green) / 0.25)" }
          : module.status === "pending"
          ? { border: "1px solid hsl(var(--amber) / 0.25)", background: "hsl(var(--amber) / 0.02)" }
          : { border: "1px solid hsl(var(--border))" }
      }
    >
      {/* Glow orb */}
      <div
        className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{ background: `hsl(var(${meta.colorVar}) / 0.5)`, transform: "translate(30%,-30%)" }}
      />

      <div className="flex items-start justify-between relative">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `hsl(var(${meta.colorVar}) / 0.1)`,
            border: `1px solid hsl(var(${meta.colorVar}) / 0.25)`,
            color: `hsl(var(${meta.colorVar}))`,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
          style={{
            background: `hsl(var(${meta.colorVar}) / 0.1)`,
            color: `hsl(var(${meta.colorVar}))`,
            border: `1px solid hsl(var(${meta.colorVar}) / 0.2)`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(var(${meta.colorVar}))` }} />
          {meta.label}
        </span>
      </div>

      <div className="relative space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{module.module_name}</h3>
        {module.module_description && (
          <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
            {module.module_description}
          </p>
        )}
      </div>

      <div className="relative flex items-center justify-between mt-auto pt-3"
        style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold" style={{ color: "hsl(var(--amber))", fontFamily: "'DM Mono', monospace" }}>
            £{module.effective_price.toFixed(2)}
          </span>
          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>/mo</span>
        </div>

        {module.status === "active" ? (
          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: "hsl(var(--green) / 0.1)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.25)" }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
          </span>
        ) : module.status === "pending" ? (
          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: "hsl(var(--amber) / 0.1)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber) / 0.25)" }}>
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        ) : (
          <button onClick={() => onRequest(module.id)} disabled={requesting}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg nav-transition"
            style={{
              background: "hsl(var(--amber) / 0.12)", color: "hsl(var(--amber))",
              border: "1px solid hsl(var(--amber) / 0.3)", opacity: requesting ? 0.6 : 1,
            }}>
            {requesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Puzzle className="w-3.5 h-3.5" />}
            {module.status === "rejected" ? "Request Again" : "Request Access"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function AdminSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) ?? "general";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const switchTab = (t: Tab) => {
    setActiveTab(t);
    setSearchParams({ tab: t }, { replace: true });
  };

  const token = () => localStorage.getItem("access_token");

  /* ── General tab state ── */
  const [profile, setProfile] = useState<FranchiseProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/franchise/me", { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setProfile(data); })
      .finally(() => setProfileLoading(false));
  }, []);

  const handleSaveGeneral = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/franchise/me", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name, email: profile.email, phone: profile.phone,
          address: profile.address, city: profile.city, state: profile.state,
          postal_code: profile.postal_code, country: profile.country,
        }),
      });
      if (res.ok) {
        setProfile(await res.json());
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof FranchiseProfile, val: string) =>
    setProfile((p) => p ? { ...p, [key]: val } : p);

  /* ── Modules tab state ── */
  const [modules, setModules] = useState<CatalogueModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "modules") return;
    setModulesLoading(true);
    fetch("/api/modules", { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.ok ? r.json() : [])
      .then(setModules)
      .finally(() => setModulesLoading(false));
  }, [activeTab]);

  const handleRequest = async (moduleId: string) => {
    setRequestingId(moduleId);
    try {
      const res = await fetch(`/api/modules/${moduleId}/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, status: "pending" as const } : m));
      }
    } finally {
      setRequestingId(null);
    }
  };

  const activeCount  = modules.filter((m) => m.status === "active").length;
  const pendingCount = modules.filter((m) => m.status === "pending").length;
  const availCount   = modules.filter((m) => m.status === "inactive" || m.status === "rejected").length;

  /* ── Render ── */
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General",  icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: "modules", label: "Modules",  icon: <Puzzle className="w-3.5 h-3.5" /> },
  ];

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6 animate-fade-in-up">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(var(--amber) / 0.12)", border: "1px solid hsl(var(--amber) / 0.25)" }}>
            <Settings className="w-5 h-5" style={{ color: "hsl(var(--amber))" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              Manage your franchise profile and add-on modules
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
          style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => switchTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium nav-transition"
              style={activeTab === tab.id
                ? { background: "hsl(var(--amber) / 0.12)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber) / 0.25)" }
                : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }
              }>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── General tab ─────────────────────────────────────────── */}
        {activeTab === "general" && (
          <div className="max-w-2xl space-y-5">
            {profileLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
              </div>
            ) : !profile ? (
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Could not load franchise profile.</p>
            ) : (
              <>
                {/* Business info card */}
                <div className="card-elevated rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Building2 className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
                    Business Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Business Name</Label>
                      <Input value={profile.name} onChange={(e) => set("name", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs"><Mail className="w-3 h-3" /> Email</Label>
                      <Input type="email" value={profile.email} onChange={(e) => set("email", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs"><Phone className="w-3 h-3" /> Phone</Label>
                      <Input value={profile.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className="h-9 text-sm" placeholder="+44 …" />
                    </div>
                  </div>
                </div>

                {/* Address card */}
                <div className="card-elevated rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
                    Address
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Street Address</Label>
                      <Input value={profile.address ?? ""} onChange={(e) => set("address", e.target.value)} className="h-9 text-sm" placeholder="123 Main Street" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">City</Label>
                      <Input value={profile.city ?? ""} onChange={(e) => set("city", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">County / State</Label>
                      <Input value={profile.state ?? ""} onChange={(e) => set("state", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Postcode</Label>
                      <Input value={profile.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs"><Globe className="w-3 h-3" /> Country</Label>
                      <Input value={profile.country ?? ""} onChange={(e) => set("country", e.target.value)} className="h-9 text-sm" placeholder="United Kingdom" />
                    </div>
                  </div>
                </div>

                {/* Save */}
                <div className="flex justify-end">
                  <Button onClick={handleSaveGeneral} disabled={saving}
                    className="flex items-center gap-2"
                    style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                    {saved
                      ? <><CheckCircle className="w-4 h-4" /> Saved!</>
                      : saving
                        ? <><Save className="w-4 h-4" /> Saving…</>
                        : <><Save className="w-4 h-4" /> Save Changes</>
                    }
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Modules tab ─────────────────────────────────────────── */}
        {activeTab === "modules" && (
          <div className="space-y-5">
            {/* Summary pills */}
            {!modulesLoading && modules.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {activeCount > 0 && (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: "hsl(var(--green) / 0.1)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.2)" }}>
                    {activeCount} active
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: "hsl(var(--amber) / 0.1)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber) / 0.2)" }}>
                    {pendingCount} pending
                  </span>
                )}
                {availCount > 0 && (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: "hsl(var(--muted-foreground) / 0.1)", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--muted-foreground) / 0.2)" }}>
                    {availCount} available
                  </span>
                )}
              </div>
            )}

            {modulesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
              </div>
            ) : modules.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ border: "1px dashed hsl(var(--border))" }}>
                <Puzzle className="w-10 h-10 mx-auto mb-4" style={{ color: "hsl(var(--muted-foreground))" }} />
                <p className="font-medium text-foreground">No modules available yet</p>
                <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Your administrator hasn't published any modules. Check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((m) => (
                  <ModuleCard key={m.id} module={m} onRequest={handleRequest} requesting={requestingId === m.id} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
