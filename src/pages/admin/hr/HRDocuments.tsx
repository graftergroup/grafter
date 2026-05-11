import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ModuleGate } from "@/components/ModuleGate";
import { DataTable } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, ExternalLink, Trash2 } from "lucide-react";

interface Employee { id: string; first_name: string; last_name: string; }
interface Doc {
  id: string; employee_id: string; employee_name?: string;
  title: string; doc_type: string; file_url?: string;
  notes?: string; uploaded_by?: string; created_at?: string;
}

const DOC_TYPES = ["contract", "id", "certificate", "other"];
const DOC_COLORS: Record<string, string> = {
  contract: "--blue", id: "--amber", certificate: "--green", other: "--muted-foreground",
};

export default function HRDocuments() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [empId, setEmpId] = useState("");
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("contract");
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const token = () => localStorage.getItem("access_token");

  const load = async () => {
    const [docsRes, empRes] = await Promise.all([
      fetch("/api/hr/documents", { headers: { Authorization: `Bearer ${token()}` } }),
      fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${token()}` } }),
    ]);
    if (docsRes.ok) setDocs(await docsRes.json());
    if (empRes.ok) setEmployees(await empRes.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    await fetch("/api/hr/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: empId, title, doc_type: docType, file_url: fileUrl || null, notes: notes || null }),
    });
    setSaving(false);
    setDialogOpen(false);
    setTitle(""); setEmpId(""); setFileUrl(""); setNotes("");
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/hr/documents/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    load();
  };

  const filtered = filterType === "all" ? docs : docs.filter(d => d.doc_type === filterType);

  const columns: ColDef<Doc>[] = [
    { key: "title", label: "Document", sortable: true, render: (d) => (
      <div>
        <p className="font-medium text-sm">{d.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{d.notes}</p>
      </div>
    )},
    { key: "doc_type", label: "Type", render: (d) => (
      <span className="text-xs px-2 py-0.5 rounded capitalize font-medium"
        style={{ background: `hsl(var(${DOC_COLORS[d.doc_type] ?? "--muted-foreground"})/0.1)`, color: `hsl(var(${DOC_COLORS[d.doc_type] ?? "--muted-foreground"}))` }}>
        {d.doc_type}
      </span>
    )},
    { key: "employee_name", label: "Employee", sortable: true, render: (d) => (
      <span className="text-sm">{d.employee_name ?? "—"}</span>
    )},
    { key: "uploaded_by", label: "Uploaded by", render: (d) => (
      <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{d.uploaded_by ?? "—"}</span>
    )},
    { key: "created_at", label: "Date", sortable: true, render: (d) => (
      <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{d.created_at ? new Date(d.created_at).toLocaleDateString("en-AU") : "—"}</span>
    )},
    { key: "id", label: "", align: "right", render: (d) => (
      <div className="flex items-center gap-2 justify-end">
        {d.file_url && (
          <a href={d.file_url} target="_blank" rel="noreferrer"
            className="p-1.5 rounded nav-transition" style={{ color: "hsl(var(--amber))" }}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={() => handleDelete(d.id)}
          className="p-1.5 rounded nav-transition" style={{ color: "hsl(var(--red))" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )},
  ];

  return (
    <AdminLayout>
      <ModuleGate slug="hr" moduleName="HR Module">
        <div className="space-y-5 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6" style={{ color: "hsl(var(--amber))" }} />
              Documents
            </h1>
            <div className="flex items-center gap-2">
              {/* Type filter */}
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}>
                {["all", ...DOC_TYPES].map(t => (
                  <button key={t} onClick={() => setFilterType(t)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium nav-transition capitalize"
                    style={filterType === t
                      ? { background: "hsl(var(--amber)/0.12)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber)/0.25)" }
                      : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }}>
                    {t}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => { setDialogOpen(true); setEmpId(employees[0]?.id ?? ""); }}
                style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Document
              </Button>
            </div>
          </div>

          <DataTable<Doc> columns={columns} data={filtered} rowKey="id" searchPlaceholder="Search documents…"
            searchKeys={["title", "doc_type", "employee_name"]} loading={loading} emptyText="No documents found." />
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <select value={empId} onChange={e => setEmpId(e.target.value)}
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Employment Contract 2026" /></div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="w-full h-9 rounded-md border px-3 text-sm capitalize"
                  style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label>File URL (optional)</Label><Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://…" /></div>
              <div className="space-y-1.5"><Label>Notes (optional)</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={saving || !title || !empId}
                style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                {saving ? "Saving…" : "Save Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </ModuleGate>
    </AdminLayout>
  );
}
