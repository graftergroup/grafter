import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ModuleGate } from "@/components/ModuleGate";
import { StatusChip } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Plus, ChevronDown, ChevronUp } from "lucide-react";

interface Employee { id: string; first_name: string; last_name: string; }
interface Review {
  id: string; employee_id: string; employee_name?: string;
  reviewer_name?: string; period: string; overall_rating: number;
  goals?: string; strengths?: string; improvements?: string;
  notes?: string; status: string; review_date?: string;
}

function StarRating({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange?.(s)} className={onChange ? "nav-transition" : ""} disabled={!onChange}>
          <Star className="w-4 h-4" fill={s <= rating ? "hsl(var(--amber))" : "none"}
            style={{ color: s <= rating ? "hsl(var(--amber))" : "hsl(var(--muted-foreground))" }} />
        </button>
      ))}
    </span>
  );
}

export default function HRPerformance() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [empId, setEmpId] = useState("");
  const [period, setPeriod] = useState("");
  const [rating, setRating] = useState(3);
  const [goals, setGoals] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const token = () => localStorage.getItem("access_token");

  const load = async () => {
    const [rRes, eRes] = await Promise.all([
      fetch("/api/hr/performance", { headers: { Authorization: `Bearer ${token()}` } }),
      fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${token()}` } }),
    ]);
    if (rRes.ok) setReviews(await rRes.json());
    if (eRes.ok) setEmployees(await eRes.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    await fetch("/api/hr/performance", {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: empId, period, overall_rating: rating, goals: goals || null, strengths: strengths || null, improvements: improvements || null, notes: notes || null, status: "completed" }),
    });
    setSaving(false); setDialogOpen(false);
    setPeriod(""); setGoals(""); setStrengths(""); setImprovements(""); setNotes(""); setRating(3);
    load();
  };

  const handleMarkComplete = async (id: string) => {
    await fetch(`/api/hr/performance/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    load();
  };

  return (
    <AdminLayout>
      <ModuleGate slug="hr" moduleName="HR Module">
        <div className="space-y-5 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Star className="w-6 h-6" style={{ color: "hsl(var(--amber))" }} />
              Performance Reviews
            </h1>
            <Button size="sm" onClick={() => { setDialogOpen(true); setEmpId(employees[0]?.id ?? ""); }}
              style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Review
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl p-10 text-center" style={{ border: "1px dashed hsl(var(--border))" }}>
              <Star className="w-8 h-8 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground))" }} />
              <p className="text-sm font-medium">No performance reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.map(r => (
                <div key={r.id} className="card-elevated rounded-xl overflow-hidden">
                  {/* Row */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{r.employee_name ?? "—"}</span>
                        <span className="text-xs px-2 py-0.5 rounded"
                          style={{ background: "hsl(var(--muted-foreground)/0.1)", color: "hsl(var(--muted-foreground))" }}>
                          {r.period}
                        </span>
                        <StatusChip value={r.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <StarRating rating={r.overall_rating} />
                        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                          Reviewed by {r.reviewer_name ?? "—"} · {r.review_date ? new Date(r.review_date).toLocaleDateString("en-AU") : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.status === "draft" && (
                        <button onClick={() => handleMarkComplete(r.id)}
                          className="text-xs px-3 py-1.5 rounded-lg nav-transition"
                          style={{ background: "hsl(var(--green)/0.1)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green)/0.3)" }}>
                          Mark Complete
                        </button>
                      )}
                      <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className="p-2 rounded-lg nav-transition" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {expanded === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {expanded === r.id && (
                    <div className="border-t grid grid-cols-1 lg:grid-cols-3 gap-0"
                      style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--sidebar-bg))" }}>
                      {[["Goals", r.goals], ["Strengths", r.strengths], ["Areas for Improvement", r.improvements]].map(([label, val], i) => (
                        <div key={label as string} className={`p-4 ${i > 0 ? "border-l" : ""}`}
                          style={{ borderColor: "hsl(var(--border))" }}>
                          <p className="text-xs font-semibold mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>{label as string}</p>
                          <p className="text-sm text-foreground whitespace-pre-line">{(val as string) || <span className="italic" style={{ color: "hsl(var(--muted-foreground))" }}>Not provided</span>}</p>
                        </div>
                      ))}
                      {r.notes && (
                        <div className="col-span-full border-t p-4" style={{ borderColor: "hsl(var(--border))" }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Notes</p>
                          <p className="text-sm">{r.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>New Performance Review</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Employee</Label>
                  <select value={empId} onChange={e => setEmpId(e.target.value)}
                    className="w-full h-9 rounded-md border px-3 text-sm"
                    style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Period</Label><Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. Q1 2026" /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Overall Rating ({rating}/5)</Label>
                <StarRating rating={rating} onChange={setRating} />
              </div>
              <div className="space-y-1.5"><Label>Goals</Label><Input value={goals} onChange={e => setGoals(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Strengths</Label><Input value={strengths} onChange={e => setStrengths(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Areas for Improvement</Label><Input value={improvements} onChange={e => setImprovements(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Additional Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={saving || !period || !empId}
                style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                {saving ? "Saving…" : "Save Review"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </ModuleGate>
    </AdminLayout>
  );
}
