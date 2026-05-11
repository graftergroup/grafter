import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ModuleGate } from "@/components/ModuleGate";
import { DataTable, StatusChip } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Plus, CheckCircle, XCircle } from "lucide-react";

interface Employee { id: string; first_name: string; last_name: string; }
interface Expense {
  id: string; employee_id: string; employee_name?: string;
  description: string; amount: number; category: string;
  expense_date?: string; status: string; receipt_url?: string;
  reviewed_by?: string; notes?: string;
}

const CATEGORIES = ["travel", "equipment", "meals", "other"];
const CAT_COLORS: Record<string, string> = {
  travel: "--blue", equipment: "--amber", meals: "--green", other: "--muted-foreground",
};

export default function HRExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [empId, setEmpId] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const token = () => localStorage.getItem("access_token");

  const load = async () => {
    const [eRes, empRes] = await Promise.all([
      fetch("/api/hr/expenses", { headers: { Authorization: `Bearer ${token()}` } }),
      fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${token()}` } }),
    ]);
    if (eRes.ok) setExpenses(await eRes.json());
    if (empRes.ok) setEmployees(await empRes.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    await fetch("/api/hr/expenses", {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: empId, description: desc, amount: parseFloat(amount), category, expense_date: expDate, receipt_url: receiptUrl || null }),
    });
    setSaving(false); setDialogOpen(false);
    setDesc(""); setAmount(""); setReceiptUrl("");
    load();
  };

  const handleReview = async (id: string, status: string) => {
    await fetch(`/api/hr/expenses/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const filtered = filterStatus === "all" ? expenses : expenses.filter(e => e.status === filterStatus);

  // Summary totals
  const pendingTotal = expenses.filter(e => e.status === "pending").reduce((s, e) => s + e.amount, 0);
  const approvedTotal = expenses.filter(e => e.status === "approved").reduce((s, e) => s + e.amount, 0);

  const columns: ColDef<Expense>[] = [
    { key: "employee_name", label: "Employee", sortable: true, render: (e) => <span className="font-medium text-sm">{e.employee_name ?? "—"}</span> },
    { key: "description", label: "Description", render: (e) => <span className="text-sm">{e.description}</span> },
    { key: "category", label: "Category", render: (e) => (
      <span className="text-xs px-2 py-0.5 rounded capitalize font-medium"
        style={{ background: `hsl(var(${CAT_COLORS[e.category] ?? "--muted-foreground"})/0.1)`, color: `hsl(var(${CAT_COLORS[e.category] ?? "--muted-foreground"}))` }}>
        {e.category}
      </span>
    )},
    { key: "amount", label: "Amount", sortable: true, align: "right", render: (e) => (
      <span className="font-mono font-semibold text-sm" style={{ color: "hsl(var(--amber))" }}>£{e.amount.toFixed(2)}</span>
    )},
    { key: "expense_date", label: "Date", sortable: true, render: (e) => (
      <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{e.expense_date ? new Date(e.expense_date).toLocaleDateString("en-AU") : "—"}</span>
    )},
    { key: "status", label: "Status", render: (e) => <StatusChip value={e.status} /> },
    { key: "id", label: "", align: "right", render: (e) => e.status === "pending" ? (
      <div className="flex gap-1.5 justify-end">
        <button onClick={() => handleReview(e.id, "approved")}
          className="text-xs px-2 py-1 rounded nav-transition flex items-center gap-1"
          style={{ background: "hsl(var(--green)/0.1)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green)/0.3)" }}>
          <CheckCircle className="w-3 h-3" /> Approve
        </button>
        <button onClick={() => handleReview(e.id, "rejected")}
          className="text-xs px-2 py-1 rounded nav-transition flex items-center gap-1"
          style={{ background: "hsl(var(--red)/0.08)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red)/0.2)" }}>
          <XCircle className="w-3 h-3" /> Reject
        </button>
      </div>
    ) : null },
  ];

  return (
    <AdminLayout>
      <ModuleGate slug="hr" moduleName="HR Module">
        <div className="space-y-5 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6" style={{ color: "hsl(var(--amber))" }} />
              Expenses
            </h1>
            <Button size="sm" onClick={() => { setDialogOpen(true); setEmpId(employees[0]?.id ?? ""); }}
              style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Claim
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Pending Approval", value: `£${pendingTotal.toFixed(2)}`, color: "amber" },
              { label: "Approved (All Time)", value: `£${approvedTotal.toFixed(2)}`, color: "green" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card-elevated rounded-xl p-4">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: `hsl(var(--${color}))` }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg w-fit" style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}>
            {["all", "pending", "approved", "rejected"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-md text-xs font-medium nav-transition capitalize"
                style={filterStatus === s
                  ? { background: "hsl(var(--amber)/0.12)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber)/0.25)" }
                  : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }}>
                {s}
              </button>
            ))}
          </div>

          <DataTable<Expense> columns={columns} data={filtered} rowKey="id"
            searchPlaceholder="Search expenses…" searchKeys={["description", "employee_name", "category"]}
            loading={loading} emptyText="No expense claims." />
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Expense Claim</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <select value={empId} onChange={e => setEmpId(e.target.value)}
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label>Description</Label><Input value={desc} onChange={e => setDesc(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Amount (£)</Label><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full h-9 rounded-md border px-3 text-sm capitalize"
                    style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Receipt URL (optional)</Label><Input value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)} placeholder="https://…" /></div>
              <Button className="w-full" onClick={handleCreate} disabled={saving || !desc || !amount || !empId}
                style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                {saving ? "Saving…" : "Submit Claim"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </ModuleGate>
    </AdminLayout>
  );
}
