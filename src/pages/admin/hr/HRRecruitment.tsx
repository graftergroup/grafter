import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ModuleGate } from "@/components/ModuleGate";
import { DataTable, StatusChip } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Pencil, Trash2 } from "lucide-react";

interface Posting {
  id: string;
  title: string;
  description?: string;
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  requirements?: string;
  status: string;
  posted_at?: string;
  closes_at?: string;
  created_at?: string;
}

const EMP_TYPES = ["full_time", "part_time", "casual"];
const STATUSES = ["draft", "open", "closed"];

const STATUS_COLORS: Record<string, string> = {
  open: "green",
  draft: "amber",
  closed: "red",
};

function fmt(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtType(t?: string) {
  if (!t) return "—";
  return t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function RecruitmentContent() {
  const [postings, setPostings] = useState<Posting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Posting | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [empType, setEmpType] = useState("full_time");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [requirements, setRequirements] = useState("");
  const [status, setStatus] = useState("draft");
  const [closesAt, setClosesAt] = useState("");

  const token = () => localStorage.getItem("access_token");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus !== "all" ? `?status=${filterStatus}` : "";
      const r = await fetch(`/api/hr/recruitment${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (r.ok) setPostings(await r.json());
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setTitle(""); setDescription(""); setLocation("");
    setEmpType("full_time"); setSalaryMin(""); setSalaryMax("");
    setRequirements(""); setStatus("draft"); setClosesAt("");
    setDialogOpen(true);
  }

  function openEdit(p: Posting) {
    setEditing(p);
    setTitle(p.title); setDescription(p.description ?? "");
    setLocation(p.location ?? ""); setEmpType(p.employment_type ?? "full_time");
    setSalaryMin(p.salary_min ? String(p.salary_min) : "");
    setSalaryMax(p.salary_max ? String(p.salary_max) : "");
    setRequirements(p.requirements ?? ""); setStatus(p.status);
    setClosesAt(p.closes_at ? p.closes_at.slice(0, 10) : "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const body = {
        title, description, location, employment_type: empType,
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        requirements, status,
        closes_at: closesAt || null,
      };
      const url = editing ? `/api/hr/recruitment/${editing.id}` : "/api/hr/recruitment";
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) { setDialogOpen(false); load(); }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/hr/recruitment/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    setDeleteId(null);
    load();
  }

  const filtered = filterStatus === "all" ? postings : postings.filter((p) => p.status === filterStatus);

  const columns: ColDef<Posting>[] = [
    {
      key: "title",
      label: "Job Title",
      sortable: true,
      render: (p) => <span className="font-medium">{p.title}</span>,
    },
    { key: "employment_type", label: "Type", render: (p) => fmtType(p.employment_type) },
    { key: "location", label: "Location", render: (p) => p.location ?? "—" },
    {
      key: "salary_min",
      label: "Salary",
      render: (p) => {
        if (!p.salary_min && !p.salary_max) return "—";
        if (p.salary_min && p.salary_max) return `£${p.salary_min.toLocaleString()} – £${p.salary_max.toLocaleString()}`;
        return `£${(p.salary_min ?? p.salary_max ?? 0).toLocaleString()}`;
      },
    },
    {
      key: "status",
      label: "Status",
      render: (p) => <StatusChip value={p.status} />,
    },
    { key: "posted_at", label: "Posted", sortable: true, render: (p) => fmt(p.posted_at) },
    { key: "closes_at", label: "Closes", render: (p) => fmt(p.closes_at) },
    {
      key: "id",
      label: "",
      align: "right",
      render: (p) => (
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Recruitment</h1>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Post Job
          </Button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {["all", ...STATUSES].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filterStatus === s ? "default" : "outline"}
              onClick={() => setFilterStatus(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          rowKey="id"
          searchPlaceholder="Search job postings…"
          searchKeys={["title", "location", "employment_type"]}
          loading={loading}
          emptyText="No job postings yet."
        />

        {/* Create / Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)" }}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Job Posting" : "Post a New Job"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Job Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Field Technician" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employment Type</Label>
                  <Select value={empType} onValueChange={setEmpType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMP_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{fmtType(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Manchester" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Salary Min (£)</Label>
                  <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="e.g. 25000" />
                </div>
                <div>
                  <Label>Salary Max (£)</Label>
                  <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="e.g. 35000" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Role overview, responsibilities…" />
              </div>
              <div>
                <Label>Requirements</Label>
                <Textarea rows={3} value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Skills, qualifications, experience…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Closes At</Label>
                  <Input type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !title.trim()}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Post Job"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="max-w-sm" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)" }}>
            <DialogHeader>
              <DialogTitle>Delete Job Posting?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

export default function HRRecruitment() {
  return (
    <ModuleGate slug="hr" moduleName="HR Module">
      <RecruitmentContent />
    </ModuleGate>
  );
}
