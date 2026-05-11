import { useState, useEffect, useCallback } from "react";
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
import {
  Puzzle,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Building2,
  Clock,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
interface ModuleRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  monthly_price: number;
  is_available: boolean;
  active_franchise_count: number;
  pending_request_count: number;
  created_at: string;
}

interface ModuleRequest {
  id: string;
  franchise_id: string;
  franchise_name?: string;
  module_id: string;
  module_name: string;
  module_description?: string;
  status: string;
  effective_price: number;
  requested_at?: string;
}

/* ─── Main component ─────────────────────────────────────────────── */
export function ModuleManagement() {
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [requests, setRequests] = useState<ModuleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reqLoading, setReqLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formAvailable, setFormAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  // Approve dialog state
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveReq, setApproveReq] = useState<ModuleRequest | null>(null);
  const [approvePrice, setApprovePrice] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);

  const token = () => localStorage.getItem("access_token");

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/modules", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setModules(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const res = await fetch("/api/superadmin/modules/requests", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setRequests(await res.json());
    } finally {
      setReqLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
    fetchRequests();
  }, [fetchModules, fetchRequests]);

  const openCreate = () => {
    setEditing(null);
    setFormName(""); setFormSlug(""); setFormDesc(""); setFormPrice(""); setFormAvailable(true);
    setDialogOpen(true);
  };

  const openEdit = (m: ModuleRecord) => {
    setEditing(m);
    setFormName(m.name);
    setFormSlug(m.slug);
    setFormDesc(m.description ?? "");
    setFormPrice(String(m.monthly_price));
    setFormAvailable(m.is_available);
    setDialogOpen(true);
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/superadmin/modules/${editing.id}` : "/api/superadmin/modules";
      const method = editing ? "PUT" : "POST";
      const body = editing
        ? { name: formName, description: formDesc, monthly_price: parseFloat(formPrice) || 0, is_available: formAvailable }
        : { name: formName, slug: formSlug || autoSlug(formName), description: formDesc, monthly_price: parseFloat(formPrice) || 0, is_available: formAvailable };

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchModules();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete module "${name}"? This will remove it from all franchises.`)) return;
    await fetch(`/api/superadmin/modules/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchModules();
  };

  const handleToggleAvailable = async (m: ModuleRecord) => {
    await fetch(`/api/superadmin/modules/${m.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: !m.is_available }),
    });
    fetchModules();
  };

  const openApprove = (req: ModuleRequest) => {
    setApproveReq(req);
    setApprovePrice(String(req.effective_price));
    setApproveOpen(true);
  };

  const handleApprove = async (reqStatus: "active" | "rejected") => {
    if (!approveReq) return;
    setApproveLoading(true);
    try {
      await fetch(
        `/api/superadmin/franchises/${approveReq.franchise_id}/modules/${approveReq.module_id}/approve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            status: reqStatus,
            custom_price: reqStatus === "active" && approvePrice ? parseFloat(approvePrice) : null,
          }),
        }
      );
      setApproveOpen(false);
      fetchRequests();
      fetchModules();
    } finally {
      setApproveLoading(false);
    }
  };

  /* ── Module columns ─────────────────────────────────────────── */
  const moduleCols: ColDef<ModuleRecord>[] = [
    {
      key: "name", label: "Module", sortable: true,
      render: (m) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(var(--amber) / 0.12)", border: "1px solid hsl(var(--amber) / 0.25)", color: "hsl(var(--amber))" }}
          >
            <Puzzle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{m.name}</p>
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))", fontFamily: "'DM Mono', monospace" }}>{m.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "description", label: "Description",
      render: (m) => <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{m.description || "—"}</span>,
    },
    {
      key: "monthly_price", label: "Price/mo", sortable: true, align: "right",
      render: (m) => (
        <span className="font-mono text-sm font-semibold" style={{ color: "hsl(var(--green))" }}>
          £{m.monthly_price.toFixed(2)}
        </span>
      ),
    },
    {
      key: "active_franchise_count", label: "Active", sortable: true, align: "right",
      render: (m) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-sm font-semibold" style={{ color: "hsl(var(--blue))" }}>{m.active_franchise_count}</span>
          {m.pending_request_count > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "hsl(var(--amber) / 0.15)", color: "hsl(var(--amber))" }}>
              {m.pending_request_count} pending
            </span>
          )}
        </div>
      ),
    },
    {
      key: "is_available", label: "Available", sortable: true,
      render: (m) => <StatusChip value={m.is_available ? "active" : "inactive"} />,
    },
    {
      key: "id", label: "", align: "right",
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleToggleAvailable(m)}
            title={m.is_available ? "Hide from franchises" : "Make available"}
            className="w-7 h-7 rounded-md flex items-center justify-center nav-transition text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--accent))]"
          >
            {m.is_available ? <ToggleRight className="w-4 h-4" style={{ color: "hsl(var(--green))" }} /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={() => openEdit(m)} className="w-7 h-7 rounded-md flex items-center justify-center nav-transition text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--accent))]">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(m.id, m.name)} className="w-7 h-7 rounded-md flex items-center justify-center nav-transition text-[hsl(var(--muted-foreground))] hover:text-destructive hover:bg-[hsl(var(--destructive)/0.1)]">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  /* ── Request columns ────────────────────────────────────────── */
  const reqCols: ColDef<ModuleRequest>[] = [
    {
      key: "franchise_name", label: "Franchise", sortable: true,
      render: (r) => <Avatar name={r.franchise_name ?? "?"} sub={r.module_name} />,
    },
    {
      key: "module_name", label: "Module", sortable: true,
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-foreground">{r.module_name}</p>
          {r.module_description && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{r.module_description}</p>}
        </div>
      ),
    },
    {
      key: "effective_price", label: "Default Price", align: "right",
      render: (r) => <span className="font-mono text-sm">£{r.effective_price.toFixed(2)}/mo</span>,
    },
    {
      key: "requested_at", label: "Requested", sortable: true,
      render: (r) => r.requested_at
        ? <span className="text-xs font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>{new Date(r.requested_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
        : <span style={{ color: "hsl(var(--muted-foreground))" }}>—</span>,
    },
    {
      key: "id", label: "", align: "right",
      render: (r) => (
        <button
          onClick={() => openApprove(r)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md nav-transition font-medium"
          style={{ background: "hsl(var(--amber) / 0.12)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber) / 0.3)" }}
        >
          Review
        </button>
      ),
    },
  ];

  return (
    <SuperadminLayout>
      <div className="space-y-8 animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Modules</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Create and manage platform feature modules for franchisees
            </p>
          </div>
          <Button onClick={openCreate} style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Module
          </Button>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Modules", value: modules.length, icon: Puzzle, accent: "amber" },
            { label: "Active Assignments", value: modules.reduce((s, m) => s + m.active_franchise_count, 0), icon: Building2, accent: "blue" },
            { label: "Pending Requests", value: requests.length, icon: Clock, accent: requests.length > 0 ? "amber" : "green" },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="card-elevated rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `hsl(var(--${accent}) / 0.12)`, border: `1px solid hsl(var(--${accent}) / 0.25)`, color: `hsl(var(--${accent}))` }}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
                <p className="text-2xl font-bold metric-value">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Module table */}
        <DataTable<ModuleRecord>
          columns={moduleCols}
          data={modules}
          rowKey="id"
          searchPlaceholder="Search modules…"
          searchKeys={["name", "slug", "description"]}
          loading={loading}
          emptyText="No modules yet. Create one to get started."
        />

        {/* Pending requests */}
        {(reqLoading || requests.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">Pending Requests</h2>
              {requests.length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "hsl(var(--amber) / 0.15)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber) / 0.3)" }}
                >
                  {requests.length}
                </span>
              )}
            </div>
            <DataTable<ModuleRequest>
              columns={reqCols}
              data={requests}
              rowKey="id"
              searchPlaceholder="Search requests…"
              searchKeys={["franchise_name", "module_name"]}
              loading={reqLoading}
              emptyText="No pending requests."
            />
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)" }}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Module" : "New Module"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editing) setFormSlug(autoSlug(e.target.value));
                }}
                placeholder="e.g. GPS Vehicle Tracking"
              />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="gps-vehicle-tracking"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem" }}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="What does this module provide?" />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Price (£)</Label>
              <Input type="number" min="0" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "hsl(var(--accent))" }}>
              <span className="text-sm font-medium text-foreground">Available to franchisees</span>
              <button
                onClick={() => setFormAvailable(!formAvailable)}
                className="flex items-center gap-1.5 text-sm nav-transition"
                style={{ color: formAvailable ? "hsl(var(--green))" : "hsl(var(--muted-foreground))" }}
              >
                {formAvailable ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                {formAvailable ? "Yes" : "No"}
              </button>
            </div>
            <Button onClick={handleSave} disabled={saving || !formName} className="w-full" style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Module"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve / reject dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-sm" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)" }}>
          <DialogHeader>
            <DialogTitle>Review Module Request</DialogTitle>
          </DialogHeader>
          {approveReq && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg space-y-1" style={{ background: "hsl(var(--accent))" }}>
                <p className="text-sm font-semibold text-foreground">{approveReq.franchise_name}</p>
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>requesting: <strong>{approveReq.module_name}</strong></p>
              </div>
              <div className="space-y-1.5">
                <Label>Custom Monthly Price (£) — leave blank to use default</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={approvePrice}
                  onChange={(e) => setApprovePrice(e.target.value)}
                  placeholder={`Default: £${approveReq.effective_price.toFixed(2)}/mo`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove("active")}
                  disabled={approveLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-lg nav-transition font-medium"
                  style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.3)" }}
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => handleApprove("rejected")}
                  disabled={approveLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-lg nav-transition font-medium"
                  style={{ background: "hsl(var(--red) / 0.1)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red) / 0.25)" }}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperadminLayout>
  );
}
