import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTabContext } from "@/hooks/useTabs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { DataTable, StatusChip } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { PermissionEntry } from "@/types";
import { PERMISSION_SLUGS } from "@/types";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Settings,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  ClipboardList,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  staff_type?: string;
  is_active: boolean;
  franchise_id: string;
  created_at: string;
  updated_at: string;
}

interface JobRecord {
  id: string;
  status: string;
  scheduled_date: string;
  completed_date?: string;
  notes?: string;
}

type InnerTab = "profile" | "jobs" | "settings";

const INNER_TABS: { id: InnerTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile",  label: "Profile",  icon: <User className="w-3.5 h-3.5" /> },
  { id: "jobs",     label: "Jobs",     icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-3.5 h-3.5" /> },
];

function StatPill({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-4 rounded-xl"
      style={{ background: `hsl(var(--${accent}) / 0.08)`, border: `1px solid hsl(var(--${accent}) / 0.2)` }}
    >
      <span className="text-2xl font-bold" style={{ color: `hsl(var(--${accent}))`, fontFamily: "'DM Mono', monospace" }}>
        {value}
      </span>
      <span className="text-xs mt-0.5 font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
    </div>
  );
}

/* ─── Shared inner page ──────────────────────────────────────────── */
function StaffDetailInner({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { registerTab } = useTabContext();

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<InnerTab>("profile");

  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStaffType, setEditStaffType] = useState("");
  const [saving, setSaving] = useState(false);

  const { user: authUser } = useAuth();
  const canManagePermissions = !isSuperadmin &&
    (authUser?.role === "franchise_manager" || authUser?.role === "admin");

  const [perms, setPerms] = useState<PermissionEntry[]>([]);
  const [permsSaving, setPermsSaving] = useState<string | null>(null);

  const token = () => localStorage.getItem("access_token");

  const fetchStaff = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/staff/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data: StaffMember = await res.json();
        setStaff(data);
        registerTab(window.location.pathname, `${data.first_name} ${data.last_name}`);
        setEditFirst(data.first_name);
        setEditLast(data.last_name);
        setEditPhone(data.phone ?? "");
        setEditRole(data.role);
        setEditStaffType(data.staff_type ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [id, registerTab]);

  const fetchJobs = useCallback(async () => {
    if (!id) return;
    setJobsLoading(true);
    try {
      const res = await fetch(`/api/jobs?technician_id=${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setJobs(await res.json());
    } finally {
      setJobsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);
  useEffect(() => { if (activeTab === "jobs") fetchJobs(); }, [activeTab, fetchJobs]);
  useEffect(() => { if (activeTab === "settings" && canManagePermissions) fetchPerms(); }, [activeTab, canManagePermissions]); // eslint-disable-line

  const fetchPerms = async () => {
    if (!id) return;
    const res = await fetch(`/api/staff/${id}/permissions`, { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) setPerms(await res.json());
  };

  const updatePerm = async (updated: PermissionEntry) => {
    if (!id) return;
    setPermsSaving(updated.permission_slug);
    const merged = perms.map((p) => p.permission_slug === updated.permission_slug ? updated : p);
    setPerms(merged);
    await fetch(`/api/staff/${id}/permissions`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: merged }),
    });
    setPermsSaving(null);
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: editFirst, last_name: editLast, phone: editPhone, role: editRole, staff_type: editStaffType || null }),
      });
      if (res.ok) fetchStaff();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!id || !staff) return;
    await fetch(`/api/staff/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !staff.is_active }),
    });
    fetchStaff();
  };

  const handleDelete = async () => {
    if (!id || !confirm(`Delete ${staff?.first_name} ${staff?.last_name}? This cannot be undone.`)) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    navigate(isSuperadmin ? "/superadmin/staff" : "/admin/staff");
  };

  const jobColumns: ColDef<JobRecord>[] = [
    {
      key: "scheduled_date", label: "Scheduled", sortable: true,
      render: (j) => (
        <span className="font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          {new Date(j.scheduled_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    { key: "status", label: "Status", sortable: true, render: (j) => <StatusChip value={j.status} /> },
    {
      key: "completed_date", label: "Completed",
      render: (j) => j.completed_date
        ? <span className="font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            {new Date(j.completed_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        : <span style={{ color: "hsl(var(--muted-foreground))" }}>—</span>,
    },
    {
      key: "notes", label: "Notes",
      render: (j) => <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{j.notes || "—"}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-10 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-lg font-medium">Staff member not found</p>
        <Button variant="outline" onClick={() => navigate(isSuperadmin ? "/superadmin/staff" : "/admin/staff")}>
          Back to Staff
        </Button>
      </div>
    );
  }

  const completedJobs = jobs.filter((j) => j.status === "completed").length;
  const activeJobs = jobs.filter((j) => ["in_progress", "assigned"].includes(j.status)).length;

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Hero */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: "hsl(var(--blue) / 0.4)", transform: "translate(30%,-30%)" }}
        />
        <div className="relative flex items-start gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: "hsl(var(--blue) / 0.15)", border: "1px solid hsl(var(--blue) / 0.3)", color: "hsl(var(--blue))", fontFamily: "'DM Mono', monospace" }}
          >
            {staff.first_name[0]}{staff.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{staff.first_name} {staff.last_name}</h1>
              <StatusChip value={staff.is_active ? "active" : "inactive"} />
              <StatusChip value={staff.role} />
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                <Mail className="w-3.5 h-3.5" /> {staff.email}
              </span>
              {staff.phone && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <Phone className="w-3.5 h-3.5" /> {staff.phone}
                </span>
              )}
              {staff.staff_type && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <Briefcase className="w-3.5 h-3.5" /> {staff.staff_type}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          <StatPill label="Completed Jobs" value={completedJobs} accent="green" />
          <StatPill label="Active Jobs" value={activeJobs} accent="amber" />
          <StatPill
            label="Member Since"
            value={new Date(staff.created_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
            accent="blue"
          />
        </div>
      </div>

      {/* Inner tab bar */}
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
                ? { background: "hsl(var(--amber) / 0.12)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber) / 0.25)" }
                : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }
            }
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-elevated rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} /> Personal Info
            </h3>
            {[
              { label: "Full Name", value: `${staff.first_name} ${staff.last_name}` },
              { label: "Email", value: staff.email },
              { label: "Phone", value: staff.phone || "Not provided" },
              { label: "Staff Type", value: staff.staff_type || "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
          <div className="card-elevated rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} /> Role & Access
            </h3>
            {[
              { label: "Role", value: staff.role.replace(/_/g, " ") },
              { label: "Status", value: staff.is_active ? "Active" : "Inactive" },
              { label: "Joined", value: new Date(staff.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) },
              { label: "Last Updated", value: new Date(staff.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
                <p className="text-sm font-medium text-foreground capitalize">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs tab */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>All jobs assigned to this staff member</p>
          <DataTable<JobRecord>
            columns={jobColumns}
            data={jobs}
            rowKey="id"
            searchPlaceholder="Search jobs…"
            searchKeys={["status", "notes"]}
            loading={jobsLoading}
            emptyText="No jobs assigned yet."
          />
        </div>
      )}

      {/* Settings tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="card-elevated rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} /> Edit Details
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={editLast} onChange={(e) => setEditLast(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                >
                  <option value="technician">Technician</option>
                  <option value="office_staff">Office Staff</option>
                  {isSuperadmin && <option value="franchise_manager">Franchise Manager</option>}
                </select>
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label>Staff Type</Label>
                <Input value={editStaffType} onChange={(e) => setEditStaffType(e.target.value)} placeholder="e.g. Senior, Apprentice" />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={handleSave} disabled={saving} style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Toggle active */}
          <div
            className="rounded-xl p-5 flex items-center justify-between gap-4"
            style={{
              background: staff.is_active ? "hsl(var(--green) / 0.05)" : "hsl(var(--amber) / 0.05)",
              border: `1px solid hsl(var(--${staff.is_active ? "green" : "amber"}) / 0.2)`,
            }}
          >
            <div>
              <p className="font-medium text-foreground">Account Status</p>
              <p className="text-sm mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                {staff.is_active ? "This staff member can log in and access the system." : "This account is currently disabled."}
              </p>
            </div>
            <button
              onClick={handleToggleActive}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg nav-transition font-medium flex-shrink-0"
              style={
                staff.is_active
                  ? { background: "hsl(var(--amber) / 0.1)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber) / 0.3)" }
                  : { background: "hsl(var(--green) / 0.1)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.3)" }
              }
            >
              {staff.is_active ? <><ToggleLeft className="w-4 h-4" /> Deactivate</> : <><ToggleRight className="w-4 h-4" /> Activate</>}
            </button>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl p-5" style={{ background: "hsl(var(--red) / 0.05)", border: "1px solid hsl(var(--red) / 0.2)" }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--red))" }}>Danger Zone</h3>
            <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
              Permanently delete this staff member. This cannot be undone.
            </p>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg nav-transition font-medium"
              style={{ background: "hsl(var(--red) / 0.1)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red) / 0.25)" }}
            >
              <Trash2 className="w-4 h-4" /> Delete Staff Member
            </button>
          </div>

          {/* Permissions editor — admin-only, not for managers/superadmin */}
          {canManagePermissions && staff.role !== "franchise_manager" && staff.role !== "admin" && (
            <div className="card-elevated rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
                <h3 className="text-sm font-semibold text-foreground">Access Permissions</h3>
              </div>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                Override this staff member's default access. All actions default to <strong>on</strong>.
              </p>
              <div className="space-y-2">
                {PERMISSION_SLUGS.map((slug) => {
                  const perm = perms.find((p) => p.permission_slug === slug);
                  const saving2 = permsSaving === slug;
                  const viewOn = perm?.can_view ?? false;
                  const LABELS: Record<string, string> = {
                    dashboard: "Dashboard", revenue: "Revenue", customers: "Customers",
                    bookings: "Bookings", vehicles: "Vehicles", locations: "Locations",
                    modules: "Modules", settings: "Settings", team: "Team", hr: "Grafter HR",
                  };
                  const toggle = (field: "can_view" | "can_create" | "can_update" | "can_delete", val: boolean) => {
                    const base = perm ?? { permission_slug: slug, can_view: false, can_create: true, can_update: true, can_delete: true };
                    const updated: PermissionEntry = { ...base, [field]: val };
                    if (field === "can_view" && !val) {
                      updated.can_create = false; updated.can_update = false; updated.can_delete = false;
                    }
                    updatePerm(updated);
                  };
                  return (
                    <div key={slug} className="rounded-lg p-3 space-y-2"
                      style={{ background: "hsl(var(--accent))", opacity: saving2 ? 0.7 : 1, transition: "opacity 0.2s" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{LABELS[slug] ?? slug}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>View</span>
                          <Switch checked={viewOn} onCheckedChange={(v) => toggle("can_view", v)} disabled={saving2} />
                        </div>
                      </div>
                      {viewOn && (
                        <div className="flex items-center gap-4 pt-1" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                          {(["can_create", "can_update", "can_delete"] as const).map((field) => (
                            <label key={field} className="flex items-center gap-1.5 cursor-pointer select-none">
                              <Switch checked={perm?.[field] ?? true} onCheckedChange={(v) => toggle(field, v)} disabled={saving2} />
                              <span className="text-xs capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>
                                {field.replace("can_", "")}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Exported wrappers ──────────────────────────────────────────── */
export function AdminStaffDetail() {
  return (
    <AdminLayout title="Staff Member">
      <StaffDetailInner isSuperadmin={false} />
    </AdminLayout>
  );
}

export function SuperadminStaffDetail() {
  return (
    <SuperadminLayout>
      <StaffDetailInner isSuperadmin={true} />
    </SuperadminLayout>
  );
}
