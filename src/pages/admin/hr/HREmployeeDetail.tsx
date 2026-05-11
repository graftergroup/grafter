import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ModuleGate } from "@/components/ModuleGate";
import { DataTable, StatusChip } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTabContext } from "@/hooks/useTabs";
import { useAuth } from "@/hooks/useAuth";
import type { PermissionEntry } from "@/types";
import { PERMISSION_SLUGS } from "@/types";
import {
  ArrowLeft, User, CalendarDays, FileText, Star, Receipt,
  CheckCircle, XCircle, Plus, Clock, Pencil, ShieldCheck, ShieldOff, Save, X, ShieldAlert,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
interface EmployeeFull {
  id: string; first_name: string; last_name: string;
  email: string; phone?: string; role: string; staff_type?: string;
  is_active: boolean; created_at?: string;
  leave: LeaveEntry[]; shifts: ShiftEntry[]; documents: DocEntry[];
  reviews: ReviewEntry[]; expenses: ExpenseEntry[];
}
interface LeaveEntry {
  id: string; leave_type: string; start_date: string; end_date: string;
  days: number; reason?: string; status: string; created_at?: string;
}
interface ShiftEntry {
  id: string; shift_date: string; start_time: string; end_time: string;
  role?: string; notes?: string;
}
interface DocEntry {
  id: string; title: string; doc_type: string; file_url?: string;
  notes?: string; uploaded_by?: string; created_at?: string;
}
interface ReviewEntry {
  id: string; period: string; overall_rating: number; status: string;
  reviewer_name?: string; review_date?: string;
}
interface ExpenseEntry {
  id: string; description: string; amount: number; category: string;
  expense_date?: string; status: string;
}

type InnerTab = "profile" | "leave" | "shifts" | "documents" | "reviews" | "expenses";

const INNER_TABS: { id: InnerTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile",   label: "Profile",   icon: <User className="w-3.5 h-3.5" /> },
  { id: "leave",     label: "Leave",     icon: <CalendarDays className="w-3.5 h-3.5" /> },
  { id: "shifts",    label: "Shifts",    icon: <Clock className="w-3.5 h-3.5" /> },
  { id: "documents", label: "Documents", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "reviews",   label: "Reviews",   icon: <Star className="w-3.5 h-3.5" /> },
  { id: "expenses",  label: "Expenses",  icon: <Receipt className="w-3.5 h-3.5" /> },
];

const LEAVE_COLORS: Record<string, string> = {
  annual: "--blue", sick: "--red", unpaid: "--amber", other: "--muted-foreground",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className="w-3.5 h-3.5" fill={s <= rating ? "hsl(var(--amber))" : "none"}
          style={{ color: s <= rating ? "hsl(var(--amber))" : "hsl(var(--muted-foreground))" }} />
      ))}
    </span>
  );
}

export default function HREmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { registerTab } = useTabContext();

  const [emp, setEmp] = useState<EmployeeFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<InnerTab>("profile");

  // Leave dialog
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [lType, setLType] = useState("annual");
  const [lStart, setLStart] = useState("");
  const [lEnd, setLEnd] = useState("");
  const [lDays, setLDays] = useState("1");
  const [lReason, setLReason] = useState("");
  const [lSaving, setLSaving] = useState(false);

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);

  const token = () => localStorage.getItem("access_token");
  const { user: authUser } = useAuth();
  const canManagePermissions = authUser?.role === "franchise_manager" || authUser?.role === "admin" || authUser?.role === "super_admin";

  // Permissions state
  const [perms, setPerms] = useState<PermissionEntry[]>([]);
  const [permsSaving, setPermsSaving] = useState<string | null>(null); // slug being saved

  const fetchPerms = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/staff/${id}/permissions`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) setPerms(await res.json());
  }, [id]);

  const updatePerm = async (updated: PermissionEntry) => {
    if (!id) return;
    setPermsSaving(updated.permission_slug);
    const merged = perms.map((p) =>
      p.permission_slug === updated.permission_slug ? updated : p
    );
    setPerms(merged); // optimistic
    await fetch(`/api/staff/${id}/permissions`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: merged }),
    });
    setPermsSaving(null);
  };

  const fetchEmp = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/hr/employees/${id}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) {
      const data: EmployeeFull = await res.json();
      setEmp(data);
      registerTab(`/admin/hr/employees/${id}`, `${data.first_name} ${data.last_name}`);
    }
    setLoading(false);
  }, [id, registerTab]);

  useEffect(() => { fetchEmp(); fetchPerms(); }, [fetchEmp, fetchPerms]);

  const handleLeaveApprove = async (leaveId: string, status: string) => {
    await fetch(`/api/hr/leave/${leaveId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchEmp();
  };

  const handleLeaveCreate = async () => {
    if (!id) return;
    setLSaving(true);
    await fetch("/api/hr/leave", {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: id, leave_type: lType, start_date: lStart, end_date: lEnd, days: parseFloat(lDays), reason: lReason }),
    });
    setLSaving(false);
    setLeaveOpen(false);
    fetchEmp();
  };

  const startEditing = () => {
    if (!emp) return;
    setEditFirst(emp.first_name);
    setEditLast(emp.last_name);
    setEditPhone(emp.phone ?? "");
    setEditRole(emp.role);
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    setEditSaving(true);
    await fetch(`/api/staff/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: editFirst, last_name: editLast, phone: editPhone, role: editRole }),
    });
    setEditSaving(false);
    setEditing(false);
    fetchEmp();
  };

  const handleToggleAccess = async () => {
    if (!emp || !id) return;
    setAccessSaving(true);
    await fetch(`/api/staff/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !emp.is_active }),
    });
    setAccessSaving(false);
    fetchEmp();
  };

  /* ─── Column defs ──────────────────────────────────────────────── */
  const leaveColumns: ColDef<LeaveEntry>[] = [
    { key: "leave_type", label: "Type", render: (l) => (
      <span className="text-xs px-2 py-0.5 rounded font-medium capitalize"
        style={{ background: `hsl(var(${LEAVE_COLORS[l.leave_type] ?? "--muted-foreground"}) / 0.1)`, color: `hsl(var(${LEAVE_COLORS[l.leave_type] ?? "--muted-foreground"}))` }}>
        {l.leave_type}
      </span>
    )},
    { key: "start_date", label: "From", sortable: true, render: (l) => <span className="text-sm">{new Date(l.start_date).toLocaleDateString("en-AU")}</span> },
    { key: "end_date", label: "To", render: (l) => <span className="text-sm">{new Date(l.end_date).toLocaleDateString("en-AU")}</span> },
    { key: "days", label: "Days", align: "right", render: (l) => <span className="font-mono text-sm">{l.days}</span> },
    { key: "status", label: "Status", sortable: true, render: (l) => <StatusChip value={l.status} /> },
    { key: "id", label: "", render: (l) => l.status === "pending" ? (
      <div className="flex gap-1.5 justify-end">
        <button onClick={() => handleLeaveApprove(l.id, "approved")} className="text-xs px-2 py-1 rounded nav-transition"
          style={{ background: "hsl(var(--green)/0.1)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green)/0.3)" }}>
          <CheckCircle className="w-3 h-3" />
        </button>
        <button onClick={() => handleLeaveApprove(l.id, "rejected")} className="text-xs px-2 py-1 rounded nav-transition"
          style={{ background: "hsl(var(--red)/0.08)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red)/0.2)" }}>
          <XCircle className="w-3 h-3" />
        </button>
      </div>
    ) : null },
  ];

  const shiftColumns: ColDef<ShiftEntry>[] = [
    { key: "shift_date", label: "Date", sortable: true, render: (s) => <span className="text-sm">{new Date(s.shift_date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</span> },
    { key: "start_time", label: "Start", render: (s) => <span className="font-mono text-sm">{s.start_time}</span> },
    { key: "end_time", label: "End", render: (s) => <span className="font-mono text-sm">{s.end_time}</span> },
    { key: "role", label: "Role", render: (s) => <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{s.role ?? "—"}</span> },
  ];

  const docColumns: ColDef<DocEntry>[] = [
    { key: "title", label: "Document", sortable: true, render: (d) => <span className="font-medium text-sm">{d.title}</span> },
    { key: "doc_type", label: "Type", render: (d) => <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ background: "hsl(var(--muted-foreground)/0.1)", color: "hsl(var(--muted-foreground))" }}>{d.doc_type}</span> },
    { key: "uploaded_by", label: "Uploaded by", render: (d) => <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{d.uploaded_by ?? "—"}</span> },
    { key: "created_at", label: "Date", sortable: true, render: (d) => <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{d.created_at ? new Date(d.created_at).toLocaleDateString("en-AU") : "—"}</span> },
    { key: "file_url", label: "", render: (d) => d.file_url ? (
      <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs text-amber-500 hover:underline">View</a>
    ) : null },
  ];

  const reviewColumns: ColDef<ReviewEntry>[] = [
    { key: "period", label: "Period", sortable: true, render: (r) => <span className="font-medium text-sm">{r.period}</span> },
    { key: "overall_rating", label: "Rating", render: (r) => <StarRating rating={r.overall_rating} /> },
    { key: "reviewer_name", label: "Reviewer", render: (r) => <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{r.reviewer_name ?? "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const expenseColumns: ColDef<ExpenseEntry>[] = [
    { key: "description", label: "Description", render: (e) => <span className="font-medium text-sm">{e.description}</span> },
    { key: "category", label: "Category", render: (e) => <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ background: "hsl(var(--muted-foreground)/0.1)", color: "hsl(var(--muted-foreground))" }}>{e.category}</span> },
    { key: "amount", label: "Amount", align: "right", render: (e) => <span className="font-mono font-semibold text-sm" style={{ color: "hsl(var(--amber))" }}>£{e.amount.toFixed(2)}</span> },
    { key: "status", label: "Status", render: (e) => <StatusChip value={e.status} /> },
  ];

  if (loading) {
    return <AdminLayout><div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div></AdminLayout>;
  }
  if (!emp) {
    return <AdminLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Employee not found.</p></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <ModuleGate slug="hr" moduleName="HR Module">
        <div className="space-y-6 animate-fade-in-up">

          {/* Hero header */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin/hr/employees")} className="p-2 rounded-lg nav-transition"
              style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="card-elevated rounded-2xl p-5 flex-1 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                style={{ background: "hsl(var(--amber)/0.12)", border: "1px solid hsl(var(--amber)/0.25)", color: "hsl(var(--amber))", fontFamily: "'DM Mono', monospace" }}>
                {emp.first_name[0]}{emp.last_name[0]}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">{emp.first_name} {emp.last_name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <span>{emp.email}</span>
                  {emp.phone && <span>{emp.phone}</span>}
                  <span className="capitalize">{emp.role.replace(/_/g, " ")}</span>
                </div>
              </div>
              <StatusChip value={emp.is_active ? "active" : "inactive"} />
            </div>
          </div>

          {/* Inner tab bar */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}>
            {INNER_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium nav-transition flex-1 justify-center"
                style={activeTab === tab.id
                  ? { background: "hsl(var(--amber)/0.12)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber)/0.25)" }
                  : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* Profile tab */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Personal info — editable */}
              <div className="card-elevated rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Personal Info</h3>
                  {!editing ? (
                    <button onClick={startEditing} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg nav-transition"
                      style={{ background: "hsl(var(--accent))", color: "hsl(var(--muted-foreground))" }}>
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg nav-transition"
                        style={{ background: "hsl(var(--accent))", color: "hsl(var(--muted-foreground))" }}>
                        <X className="w-3 h-3" /> Cancel
                      </button>
                      <button onClick={handleSaveProfile} disabled={editSaving} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg nav-transition font-medium"
                        style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                        <Save className="w-3 h-3" /> {editSaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">First Name</Label>
                        <Input value={editFirst} onChange={(e) => setEditFirst(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Last Name</Label>
                        <Input value={editLast} onChange={(e) => setEditLast(e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="e.g. 07700 900123" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Role</Label>
                      <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="office_staff">Office Staff</SelectItem>
                          <SelectItem value="franchise_manager">Franchise Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      ["Full Name", `${emp.first_name} ${emp.last_name}`],
                      ["Email", emp.email],
                      ["Phone", emp.phone ?? "—"],
                      ["Role", emp.role.replace(/_/g, " ")],
                      ["Staff Type", emp.staff_type ?? "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
                        <span className="font-medium capitalize">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Employment summary */}
                <div className="card-elevated rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Employment</h3>
                  {[
                    ["Status", emp.is_active ? "Active" : "Inactive"],
                    ["Joined", emp.created_at ? new Date(emp.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "—"],
                    ["Approved Leave Days", emp.leave.filter(l => l.status === "approved").reduce((s, l) => s + l.days, 0).toFixed(1)],
                    ["Pending Leave", emp.leave.filter(l => l.status === "pending").length],
                    ["Open Expenses", emp.expenses.filter(e => e.status === "pending").length],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Login access */}
                <div className="card-elevated rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Login Access</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{emp.email}</p>
                      <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {emp.is_active ? "Can log in to the portal" : "Access is currently suspended"}
                      </p>
                    </div>
                    <StatusChip value={emp.is_active ? "active" : "inactive"} />
                  </div>
                  <button
                    onClick={handleToggleAccess}
                    disabled={accessSaving}
                    className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg font-medium nav-transition"
                    style={emp.is_active
                      ? { background: "hsl(var(--destructive)/0.08)", color: "hsl(var(--destructive))", border: "1px solid hsl(var(--destructive)/0.2)" }
                      : { background: "hsl(var(--green)/0.1)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green)/0.3)" }
                    }
                  >
                    {emp.is_active
                      ? <><ShieldOff className="w-4 h-4" /> {accessSaving ? "Suspending…" : "Suspend Access"}</>
                      : <><ShieldCheck className="w-4 h-4" /> {accessSaving ? "Restoring…" : "Restore Access"}</>
                    }
                  </button>
                </div>

                {/* ─── Permissions editor ─────────────────────────────── */}
                {canManagePermissions && emp.role !== "franchise_manager" && emp.role !== "admin" && (
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
                        const saving = permsSaving === slug;
                        const viewOn = perm?.can_view ?? false;

                        const LABELS: Record<string, string> = {
                          dashboard: "Dashboard", revenue: "Revenue", customers: "Customers",
                          bookings: "Bookings", vehicles: "Vehicles", locations: "Locations",
                          modules: "Modules", settings: "Settings", team: "Team", hr: "Grafter HR",
                        };

                        const toggle = (field: "can_view" | "can_create" | "can_update" | "can_delete", val: boolean) => {
                          const base = perm ?? { permission_slug: slug, can_view: false, can_create: true, can_update: true, can_delete: true };
                          const updated: PermissionEntry = { ...base, [field]: val };
                          // Turning off view also turns off all CRUD
                          if (field === "can_view" && !val) {
                            updated.can_create = false;
                            updated.can_update = false;
                            updated.can_delete = false;
                          }
                          updatePerm(updated);
                        };

                        return (
                          <div key={slug} className="rounded-lg p-3 space-y-2"
                            style={{ background: "hsl(var(--accent))", opacity: saving ? 0.7 : 1, transition: "opacity 0.2s" }}>
                            {/* View row */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">{LABELS[slug] ?? slug}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>View</span>
                                <Switch
                                  checked={viewOn}
                                  onCheckedChange={(v) => toggle("can_view", v)}
                                  disabled={saving}
                                />
                              </div>
                            </div>
                            {/* CRUD sub-row — only when view is on */}
                            {viewOn && (
                              <div className="flex items-center gap-4 pt-1" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                                {(["can_create", "can_update", "can_delete"] as const).map((field) => (
                                  <label key={field} className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <Switch
                                      checked={perm?.[field] ?? true}
                                      onCheckedChange={(v) => toggle(field, v)}
                                      disabled={saving}
                                    />
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
            </div>
          )}

          {/* Leave tab */}
          {activeTab === "leave" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Leave requests for this employee</p>
                <Button size="sm" onClick={() => setLeaveOpen(true)}
                  style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Leave
                </Button>
              </div>
              <DataTable<LeaveEntry> columns={leaveColumns} data={emp.leave} rowKey="id" searchPlaceholder="Search leave…" searchKeys={["leave_type", "status"]} emptyText="No leave requests." />
            </div>
          )}

          {/* Shifts tab */}
          {activeTab === "shifts" && (
            <DataTable<ShiftEntry> columns={shiftColumns} data={emp.shifts} rowKey="id" searchPlaceholder="Search shifts…" searchKeys={["role"]} emptyText="No shifts scheduled." />
          )}

          {/* Documents tab */}
          {activeTab === "documents" && (
            <DataTable<DocEntry> columns={docColumns} data={emp.documents} rowKey="id" searchPlaceholder="Search documents…" searchKeys={["title", "doc_type"]} emptyText="No documents." />
          )}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            <DataTable<ReviewEntry> columns={reviewColumns} data={emp.reviews} rowKey="id" searchPlaceholder="Search reviews…" searchKeys={["period"]} emptyText="No performance reviews." />
          )}

          {/* Expenses tab */}
          {activeTab === "expenses" && (
            <DataTable<ExpenseEntry> columns={expenseColumns} data={emp.expenses} rowKey="id" searchPlaceholder="Search expenses…" searchKeys={["description", "category"]} emptyText="No expense claims." />
          )}
        </div>

        {/* Leave dialog */}
        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogContent className="sm:max-w-md" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)" }}>
            <DialogHeader><DialogTitle>Add Leave Request</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select value={lType} onChange={(e) => setLType(e.target.value)}
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={lStart} onChange={(e) => setLStart(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={lEnd} onChange={(e) => setLEnd(e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Days</Label><Input type="number" min="0.5" step="0.5" value={lDays} onChange={(e) => setLDays(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Reason (optional)</Label><Input value={lReason} onChange={(e) => setLReason(e.target.value)} /></div>
              <Button className="w-full" onClick={handleLeaveCreate} disabled={lSaving || !lStart || !lEnd}
                style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                {lSaving ? "Saving…" : "Save Leave Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </ModuleGate>
    </AdminLayout>
  );
}
