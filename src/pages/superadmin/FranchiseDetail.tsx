import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { DataTable, StatusChip, Avatar } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTabContext } from "@/hooks/useTabs";
import {
  Building2,
  Users,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  FileText,
  Settings,
  ArrowLeft,
  UserPlus,
  TrendingUp,
  Percent,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  Trash2,
  Puzzle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
interface FranchiseDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  is_active: boolean;
  approval_status: string;
  subscription_status: string;
  commission_rate: number;
  billing_email?: string;
  created_at: string;
}

interface FranchiseStats {
  staff_count: number;
  total_bookings: number;
  total_revenue: number;
  completed_jobs: number;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface BillingRecord {
  id: string;
  period_start: string;
  period_end: string;
  gross_revenue: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
}

/* ─── Inner tab types ────────────────────────────────────────────── */
type InnerTab = "overview" | "staff" | "billing" | "modules" | "settings";

/* ─── FranchiseModule entry (from GET /api/superadmin/franchises/:id/modules) */
interface FranchiseModuleEntry {
  id: string;
  module_id: string;
  module_name: string;
  module_description?: string;
  module_slug: string;
  status: "active" | "pending" | "inactive" | "rejected";
  custom_price: number | null;
  effective_price: number;
  requested_at?: string;
  activated_at?: string;
}

const INNER_TABS: { id: InnerTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Overview",  icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: "staff",     label: "Staff",     icon: <Users className="w-3.5 h-3.5" /> },
  { id: "billing",   label: "Billing",   icon: <DollarSign className="w-3.5 h-3.5" /> },
  { id: "modules",   label: "Modules",   icon: <Puzzle className="w-3.5 h-3.5" /> },
  { id: "settings",  label: "Settings",  icon: <Settings className="w-3.5 h-3.5" /> },
];

/* ─── Metric card ────────────────────────────────────────────────── */
function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className="card-elevated rounded-xl p-5 relative overflow-hidden"
      style={{ borderColor: `hsl(var(--${accent}) / 0.2)` }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none"
        style={{ background: `hsl(var(--${accent}) / 0.08)`, transform: "translate(30%, -30%)" }}
      />
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `hsl(var(--${accent}) / 0.12)`, color: `hsl(var(--${accent}))` }}
        >
          {icon}
        </div>
      </div>
      <p className="metric-value text-2xl">{value}</p>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export function FranchiseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { registerTab } = useTabContext();

  const [franchise, setFranchise] = useState<FranchiseDetail | null>(null);
  const [stats, setStats] = useState<FranchiseStats | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<InnerTab>("overview");

  // Module state
  const [fmList, setFmList] = useState<FranchiseModuleEntry[]>([]);
  const [fmLoading, setFmLoading] = useState(false);
  const [fmTogglingId, setFmTogglingId] = useState<string | null>(null);
  const [fmCustomPrices, setFmCustomPrices] = useState<Record<string, string>>({});
  const [fmSavingPriceId, setFmSavingPriceId] = useState<string | null>(null);

  // Settings form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPostal, setEditPostal] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCommission, setEditCommission] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Invite staff state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast] = useState("");
  const [inviteRole, setInviteRole] = useState("technician");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const token = () => localStorage.getItem("access_token");

  const fetchFranchise = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/superadmin/franchises/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data: FranchiseDetail = await res.json();
        setFranchise(data);
        registerTab(`/superadmin/franchises/${id}`, data.name);
        setEditName(data.name);
        setEditEmail(data.email);
        setEditPhone(data.phone ?? "");
        setEditAddress(data.address ?? "");
        setEditCity(data.city ?? "");
        setEditState(data.state ?? "");
        setEditPostal(data.postal_code ?? "");
        setEditCountry(data.country ?? "");
        setEditNotes(data.notes ?? "");
        setEditCommission(String(Math.round((data.commission_rate ?? 0.1) * 100)));
      }
    } finally {
      setLoading(false);
    }
  }, [id, registerTab]);

  const fetchStats = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/superadmin/franchises/${id}/stats`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) setStats(await res.json());
  }, [id]);

  const fetchStaff = useCallback(async () => {
    if (!id) return;
    setStaffLoading(true);
    try {
      const res = await fetch(`/api/staff?franchise_id=${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setStaff(await res.json());
    } finally {
      setStaffLoading(false);
    }
  }, [id]);

  const fetchBilling = useCallback(async () => {
    if (!id) return;
    setBillingLoading(true);
    try {
      const res = await fetch(`/api/superadmin/billing?franchise_id=${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setBilling(await res.json());
    } finally {
      setBillingLoading(false);
    }
  }, [id]);

  const fetchModules = useCallback(async () => {
    if (!id) return;
    setFmLoading(true);
    try {
      const res = await fetch(`/api/superadmin/franchises/${id}/modules`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data: FranchiseModuleEntry[] = await res.json();
        setFmList(data);
        // Seed custom price inputs from current values
        const prices: Record<string, string> = {};
        data.forEach((fm) => {
          prices[fm.module_id] = fm.custom_price != null ? String(fm.custom_price) : "";
        });
        setFmCustomPrices(prices);
      }
    } finally {
      setFmLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFranchise();
    fetchStats();
  }, [fetchFranchise, fetchStats]);

  useEffect(() => {
    if (activeTab === "staff") fetchStaff();
    if (activeTab === "billing") fetchBilling();
    if (activeTab === "modules") fetchModules();
  }, [activeTab, fetchStaff, fetchBilling, fetchModules]);

  const handleSaveSettings = async () => {
    if (!id) return;
    setSavingSettings(true);
    try {
      await fetch(`/api/superadmin/franchises/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          address: editAddress,
          city: editCity,
          state: editState,
          postal_code: editPostal,
          country: editCountry,
          notes: editNotes,
        }),
      });
      // Update commission separately
      const rate = parseFloat(editCommission) / 100;
      if (!isNaN(rate)) {
        await fetch(`/api/superadmin/franchises/${id}/commission`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ commission_rate: rate }),
        });
      }
      await fetchFranchise();
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    await fetch(`/api/superadmin/franchises/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchFranchise();
  };

  const handleReject = async () => {
    if (!id || !confirm("Reject this franchise application?")) return;
    await fetch(`/api/superadmin/franchises/${id}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchFranchise();
  };

  const handleDelete = async () => {
    if (!id || !confirm("Permanently delete this franchise? This cannot be undone.")) return;
    await fetch(`/api/superadmin/franchises/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    navigate("/superadmin/franchises");
  };

  const handleSendInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          first_name: inviteFirst,
          last_name: inviteLast,
          role: inviteRole,
          franchise_id: id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.invite_url);
        fetchStaff();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to generate invite");
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  const resetInvite = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteFirst("");
    setInviteLast("");
    setInviteRole("technician");
    setInviteLink(null);
    setInviteCopied(false);
  };

  /* ── Module actions ────────────────────────────────────────────── */
  const handleModuleToggle = async (fm: FranchiseModuleEntry) => {
    if (!id) return;
    const newStatus = fm.status === "active" ? "inactive" : "active";
    setFmTogglingId(fm.module_id);
    try {
      const res = await fetch(`/api/superadmin/franchises/${id}/modules/${fm.module_id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchModules();
    } finally {
      setFmTogglingId(null);
    }
  };

  const handleModuleApprove = async (fm: FranchiseModuleEntry, customPrice?: number) => {
    if (!id) return;
    setFmTogglingId(fm.module_id);
    try {
      const body: Record<string, unknown> = { status: "active" };
      if (customPrice != null && !isNaN(customPrice)) body.custom_price = customPrice;
      const res = await fetch(`/api/superadmin/franchises/${id}/modules/${fm.module_id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) fetchModules();
    } finally {
      setFmTogglingId(null);
    }
  };

  const handleModuleReject = async (fm: FranchiseModuleEntry) => {
    if (!id) return;
    setFmTogglingId(fm.module_id);
    try {
      const res = await fetch(`/api/superadmin/franchises/${id}/modules/${fm.module_id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (res.ok) fetchModules();
    } finally {
      setFmTogglingId(null);
    }
  };

  const handleSaveCustomPrice = async (fm: FranchiseModuleEntry) => {
    if (!id) return;
    const raw = fmCustomPrices[fm.module_id];
    const price = raw === "" ? null : parseFloat(raw);
    setFmSavingPriceId(fm.module_id);
    try {
      await fetch(`/api/superadmin/franchises/${id}/modules/${fm.module_id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ custom_price: price }),
      });
      fetchModules();
    } finally {
      setFmSavingPriceId(null);
    }
  };

  /* ── Staff columns ─────────────────────────────────────────────── */
  const staffColumns: ColDef<StaffMember>[] = [
    {
      key: "first_name",
      label: "Name",
      sortable: true,
      render: (s) => <Avatar name={`${s.first_name} ${s.last_name}`} sub={s.email} />,
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (s) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-medium capitalize"
          style={{ background: "hsl(var(--blue) / 0.1)", color: "hsl(var(--blue))" }}
        >
          {s.role.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (s) => <StatusChip value={s.is_active ? "active" : "inactive"} />,
    },
  ];

  /* ── Billing columns ───────────────────────────────────────────── */
  const billingColumns: ColDef<BillingRecord>[] = [
    {
      key: "period_start",
      label: "Period",
      sortable: true,
      render: (b) => (
        <span className="font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          {new Date(b.period_start).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
          {" – "}
          {new Date(b.period_end).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "gross_revenue",
      label: "Gross Revenue",
      sortable: true,
      align: "right",
      render: (b) => (
        <span className="font-mono text-sm">${b.gross_revenue.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: "commission_rate",
      label: "Rate",
      align: "right",
      render: (b) => (
        <span className="font-mono text-sm">{(b.commission_rate * 100).toFixed(0)}%</span>
      ),
    },
    {
      key: "commission_amount",
      label: "Commission",
      sortable: true,
      align: "right",
      render: (b) => (
        <span className="font-mono text-sm font-semibold" style={{ color: "hsl(var(--amber))" }}>
          ${b.commission_amount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (b) => <StatusChip value={b.status} />,
    },
  ];

  /* ── Loading skeleton ──────────────────────────────────────────── */
  if (loading) {
    return (
      <SuperadminLayout>
        <div className="space-y-6">
          <div className="skeleton h-8 w-64 rounded" />
          <div className="skeleton h-32 w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        </div>
      </SuperadminLayout>
    );
  }

  if (!franchise) {
    return (
      <SuperadminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-lg font-medium">Franchise not found</p>
          <Button variant="outline" onClick={() => navigate("/superadmin/franchises")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Franchises
          </Button>
        </div>
      </SuperadminLayout>
    );
  }

  return (
    <SuperadminLayout>
      <div className="space-y-6 animate-fade-in-up">

        {/* ── Hero header ─────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "hsl(var(--sidebar-bg))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30"
            style={{ background: "hsl(var(--amber) / 0.15)", transform: "translate(30%, -30%)" }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Logo orb */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{
                  background: "hsl(var(--amber) / 0.15)",
                  border: "1px solid hsl(var(--amber) / 0.3)",
                  color: "hsl(var(--amber))",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {franchise.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{franchise.name}</h1>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {(franchise.city || franchise.state) && (
                    <span className="flex items-center gap-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                      <MapPin className="w-3.5 h-3.5" />
                      {[franchise.city, franchise.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                    <Mail className="w-3.5 h-3.5" />
                    {franchise.email}
                  </span>
                  {franchise.phone && (
                    <span className="flex items-center gap-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                      <Phone className="w-3.5 h-3.5" />
                      {franchise.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusChip value={franchise.approval_status} />
              <StatusChip value={franchise.is_active ? "active" : "inactive"} />
            </div>
          </div>

          {/* Commission badge */}
          <div className="relative mt-4 flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-sm">
              <Percent className="w-3.5 h-3.5" style={{ color: "hsl(var(--amber))" }} />
              <span style={{ color: "hsl(var(--muted-foreground))" }}>Commission:</span>
              <span className="font-semibold" style={{ color: "hsl(var(--amber))" }}>
                {(franchise.commission_rate * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Building2 className="w-3.5 h-3.5" style={{ color: "hsl(var(--blue))" }} />
              <span style={{ color: "hsl(var(--muted-foreground))" }}>Subscription:</span>
              <span className="font-semibold capitalize" style={{ color: "hsl(var(--blue))" }}>
                {franchise.subscription_status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <CalendarDays className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              <span style={{ color: "hsl(var(--muted-foreground))" }}>Joined:</span>
              <span className="font-medium text-foreground">
                {new Date(franchise.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Inner tab bar ────────────────────────────────────────── */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}
        >
          {INNER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium nav-transition flex-1 justify-center"
              style={
                activeTab === tab.id
                  ? {
                      background: "hsl(var(--amber) / 0.12)",
                      color: "hsl(var(--amber))",
                      border: "1px solid hsl(var(--amber) / 0.25)",
                    }
                  : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Staff Members"
                value={stats?.staff_count ?? "—"}
                icon={<Users className="w-4 h-4" />}
                accent="blue"
              />
              <MetricCard
                label="Total Bookings"
                value={stats?.total_bookings ?? "—"}
                icon={<CalendarDays className="w-4 h-4" />}
                accent="amber"
              />
              <MetricCard
                label="Total Revenue"
                value={stats ? `$${stats.total_revenue.toLocaleString("en-AU", { minimumFractionDigits: 0 })}` : "—"}
                icon={<DollarSign className="w-4 h-4" />}
                accent="green"
              />
              <MetricCard
                label="Completed Jobs"
                value={stats?.completed_jobs ?? "—"}
                icon={<CheckCircle2 className="w-4 h-4" />}
                accent="amber"
              />
            </div>

            {/* Address + notes info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card-elevated rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
                  Location Details
                </h3>
                <div className="space-y-2 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {franchise.address && <p>{franchise.address}</p>}
                  <p>{[franchise.city, franchise.state, franchise.postal_code].filter(Boolean).join(", ")}</p>
                  {franchise.country && <p>{franchise.country}</p>}
                  {!franchise.address && !franchise.city && <p className="italic">No address on file</p>}
                </div>
              </div>

              <div className="card-elevated rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
                  Notes
                </h3>
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {franchise.notes || <span className="italic">No notes</span>}
                </p>
              </div>
            </div>

            {/* Approval actions if pending */}
            {franchise.approval_status === "pending" && (
              <div
                className="rounded-xl p-5 flex items-center justify-between gap-4"
                style={{ background: "hsl(var(--amber) / 0.06)", border: "1px solid hsl(var(--amber) / 0.2)" }}
              >
                <div>
                  <p className="font-medium text-foreground">Pending Approval</p>
                  <p className="text-sm mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    This franchise is awaiting approval before they can operate.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleApprove}
                    className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg nav-transition font-medium"
                    style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.3)" }}
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg nav-transition font-medium"
                    style={{ background: "hsl(var(--red) / 0.1)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red) / 0.25)" }}
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Staff tab ────────────────────────────────────────────── */}
        {activeTab === "staff" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                All staff members assigned to this franchise
              </p>
              <Button
                size="sm"
                onClick={() => setInviteOpen(true)}
                style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invite Staff
              </Button>
            </div>
            <DataTable<StaffMember>
              columns={staffColumns}
              data={staff}
              rowKey="id"
              searchPlaceholder="Search staff by name or email…"
              searchKeys={["first_name", "last_name", "email"]}
              loading={staffLoading}
              emptyText="No staff members yet. Invite someone to get started."
            />
          </div>
        )}

        {/* ── Billing tab ──────────────────────────────────────────── */}
        {activeTab === "billing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                Commission billing records for this franchise
              </p>
            </div>
            <DataTable<BillingRecord>
              columns={billingColumns}
              data={billing}
              rowKey="id"
              searchPlaceholder="Search billing records…"
              searchKeys={["status"]}
              loading={billingLoading}
              emptyText="No billing records yet."
            />
          </div>
        )}

        {/* ── Modules tab ──────────────────────────────────────────── */}
        {activeTab === "modules" && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              Manage active feature modules and pricing for this franchise.
            </p>

            {fmLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-20 rounded-xl" />
                ))}
              </div>
            ) : fmList.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ border: "1px dashed hsl(var(--border))" }}
              >
                <Puzzle className="w-8 h-8 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                <p className="text-sm font-medium text-foreground">No modules available</p>
                <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Create modules in the Modules section first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {fmList.map((fm) => {
                  const isToggling = fmTogglingId === fm.module_id;
                  const isPending = fm.status === "pending";
                  const isActive = fm.status === "active";
                  const customPriceVal = fmCustomPrices[fm.module_id] ?? "";
                  const isDirtyPrice = customPriceVal !== (fm.custom_price != null ? String(fm.custom_price) : "");

                  const statusColor =
                    isActive ? "var(--green)"
                    : isPending ? "var(--amber)"
                    : fm.status === "rejected" ? "var(--red)"
                    : "var(--muted-foreground)";

                  const statusLabel =
                    isActive ? "Active"
                    : isPending ? "Pending Approval"
                    : fm.status === "rejected" ? "Rejected"
                    : "Inactive";

                  return (
                    <div
                      key={fm.module_id}
                      className="card-elevated rounded-xl p-5"
                      style={{
                        borderColor: isPending ? "hsl(var(--amber) / 0.3)" : undefined,
                        background: isPending ? "hsl(var(--amber) / 0.03)" : undefined,
                      }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon orb */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `hsl(${statusColor} / 0.1)`,
                            border: `1px solid hsl(${statusColor} / 0.25)`,
                            color: `hsl(${statusColor})`,
                          }}
                        >
                          <Puzzle className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{fm.module_name}</p>
                            {/* Status chip */}
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: `hsl(${statusColor} / 0.1)`,
                                color: `hsl(${statusColor})`,
                                border: `1px solid hsl(${statusColor} / 0.25)`,
                              }}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          {fm.module_description && (
                            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                              {fm.module_description}
                            </p>
                          )}

                          {/* Price row */}
                          <div className="mt-3 flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                              <span>Effective price:</span>
                              <span className="font-mono font-semibold text-foreground">
                                £{(fm.effective_price ?? 0).toFixed(2)}/mo
                              </span>
                            </div>
                            {/* Custom price input */}
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <span
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                                  style={{ color: "hsl(var(--muted-foreground))" }}
                                >£</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder={String(fm.effective_price ?? "")}
                                  value={customPriceVal}
                                  onChange={(e) =>
                                    setFmCustomPrices((prev) => ({
                                      ...prev,
                                      [fm.module_id]: e.target.value,
                                    }))
                                  }
                                  className="h-7 text-xs pl-5 w-28 font-mono"
                                />
                              </div>
                              {isDirtyPrice && (
                                <button
                                  onClick={() => handleSaveCustomPrice(fm)}
                                  disabled={fmSavingPriceId === fm.module_id}
                                  className="text-xs px-2 py-1 rounded-md font-medium nav-transition"
                                  style={{
                                    background: "hsl(var(--amber) / 0.12)",
                                    color: "hsl(var(--amber))",
                                    border: "1px solid hsl(var(--amber) / 0.3)",
                                  }}
                                >
                                  {fmSavingPriceId === fm.module_id ? "Saving…" : "Save price"}
                                </button>
                              )}
                              <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                                custom price/mo
                              </span>
                            </div>
                          </div>

                          {/* Pending request actions */}
                          {isPending && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                                Requested {fm.requested_at ? new Date(fm.requested_at).toLocaleDateString() : "—"}
                              </span>
                              <button
                                onClick={() => {
                                  const price = customPriceVal ? parseFloat(customPriceVal) : undefined;
                                  handleModuleApprove(fm, price);
                                }}
                                disabled={isToggling}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium nav-transition"
                                style={{
                                  background: "hsl(var(--green) / 0.12)",
                                  color: "hsl(var(--green))",
                                  border: "1px solid hsl(var(--green) / 0.3)",
                                }}
                              >
                                <CheckCircle className="w-3 h-3" />
                                {isToggling ? "…" : "Approve"}
                              </button>
                              <button
                                onClick={() => handleModuleReject(fm)}
                                disabled={isToggling}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium nav-transition"
                                style={{
                                  background: "hsl(var(--red) / 0.08)",
                                  color: "hsl(var(--red))",
                                  border: "1px solid hsl(var(--red) / 0.2)",
                                }}
                              >
                                <XCircle className="w-3 h-3" />
                                {isToggling ? "…" : "Reject"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Toggle switch (non-pending only) */}
                        {!isPending && (
                          <button
                            onClick={() => handleModuleToggle(fm)}
                            disabled={isToggling}
                            title={isActive ? "Deactivate module" : "Activate module"}
                            className="flex-shrink-0 nav-transition"
                            style={{ color: isActive ? "hsl(var(--green))" : "hsl(var(--muted-foreground))", opacity: isToggling ? 0.5 : 1 }}
                          >
                            {isActive
                              ? <ToggleRight className="w-8 h-8" />
                              : <ToggleLeft className="w-8 h-8" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Settings tab ─────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Edit form */}
            <div className="card-elevated rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                <Settings className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
                Franchise Details
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Commission Rate (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editCommission}
                      onChange={(e) => setEditCommission(e.target.value)}
                      className="pr-8"
                    />
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >%</span>
                  </div>
                </div>
                <div className="space-y-1.5 lg:col-span-2">
                  <Label>Address</Label>
                  <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={editState} onChange={(e) => setEditState(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Postal Code</Label>
                  <Input value={editPostal} onChange={(e) => setEditPostal(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} />
                </div>
                <div className="space-y-1.5 lg:col-span-2">
                  <Label>Notes</Label>
                  <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <Button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
                >
                  {savingSettings ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>

            {/* Approval actions */}
            {franchise.approval_status === "pending" && (
              <div
                className="rounded-xl p-5"
                style={{ background: "hsl(var(--amber) / 0.06)", border: "1px solid hsl(var(--amber) / 0.2)" }}
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">Approval</h3>
                <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                  This franchise is pending review.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg nav-transition font-medium"
                    style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.3)" }}
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg nav-transition font-medium"
                    style={{ background: "hsl(var(--red) / 0.1)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red) / 0.25)" }}
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            )}

            {/* Danger zone */}
            <div
              className="rounded-xl p-5"
              style={{ background: "hsl(var(--red) / 0.05)", border: "1px solid hsl(var(--red) / 0.2)" }}
            >
              <h3 className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--red))" }}>
                Danger Zone
              </h3>
              <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                Permanently delete this franchise and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg nav-transition font-medium"
                style={{ background: "hsl(var(--red) / 0.1)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red) / 0.25)" }}
              >
                <Trash2 className="w-4 h-4" /> Delete Franchise
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Invite staff dialog ──────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) resetInvite(); else setInviteOpen(true); }}>
        <DialogContent className="sm:max-w-md" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)" }}>
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
          </DialogHeader>

          {!inviteLink ? (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input value={inviteFirst} onChange={(e) => setInviteFirst(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input value={inviteLast} onChange={(e) => setInviteLast(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                >
                  <option value="technician">Technician</option>
                  <option value="office_staff">Office Staff</option>
                  <option value="franchise_manager">Franchise Manager</option>
                </select>
              </div>
              <Button
                className="w-full"
                onClick={handleSendInvite}
                disabled={inviteLoading || !inviteEmail || !inviteFirst || !inviteLast}
                style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
              >
                {inviteLoading ? "Generating…" : "Generate Invite Link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div
                className="rounded-lg p-3 text-xs font-mono break-all"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
              >
                {inviteLink}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleCopyInvite}
                  style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
                >
                  {inviteCopied ? <><Check className="w-4 h-4 mr-1.5" /> Copied!</> : <><Copy className="w-4 h-4 mr-1.5" /> Copy Link</>}
                </Button>
                <Button variant="outline" onClick={resetInvite}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperadminLayout>
  );
}
