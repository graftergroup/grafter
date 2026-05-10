import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTabContext } from "@/hooks/useTabs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, StatusChip } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  FileText,
  DollarSign,
  Calendar,
  Hash,
  CreditCard,
  ClipboardList,
  Settings,
  Trash2,
  Plus,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
interface InvoiceRecord {
  id: string;
  invoice_number: string;
  customer_id: string;
  amount: number;
  tax: number;
  total: number;
  description?: string;
  due_date?: string;
  issued_date: string;
  created_at: string;
  updated_at: string;
}

interface PaymentRecord {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method?: string;
  status: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
}

type InnerTab = "summary" | "payments" | "edit";

const INNER_TABS: { id: InnerTab; label: string; icon: React.ReactNode }[] = [
  { id: "summary",  label: "Summary",  icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "payments", label: "Payments", icon: <CreditCard className="w-3.5 h-3.5" /> },
  { id: "edit",     label: "Edit",     icon: <Settings className="w-3.5 h-3.5" /> },
];

function InfoRow({ label, value, mono }: { label: string; value: string | React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
      <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
      <span
        className={`text-sm font-medium text-foreground text-right max-w-xs ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
function InvoiceDetailInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { registerTab } = useTabContext();

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<InnerTab>("summary");

  // Edit form
  const [editAmount, setEditAmount] = useState("");
  const [editTax, setEditTax] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // New payment form
  const [addingPayment, setAddingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("card");
  const [payNotes, setPayNotes] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  const token = () => localStorage.getItem("access_token");

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data: InvoiceRecord = await res.json();
        setInvoice(data);
        registerTab(window.location.pathname, `Invoice ${data.invoice_number}`);
        setEditAmount(String(data.amount));
        setEditTax(String(data.tax));
        setEditDesc(data.description ?? "");
        setEditDueDate(data.due_date ? data.due_date.split("T")[0] : "");
      }
    } finally {
      setLoading(false);
    }
  }, [id, registerTab]);

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/payments/invoice/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setPayments(await res.json());
    } finally {
      setPaymentsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);
  useEffect(() => { if (activeTab === "payments") fetchPayments(); }, [activeTab, fetchPayments]);

  const handleSave = async () => {
    if (!id || !invoice) return;
    setSaving(true);
    try {
      const amount = parseFloat(editAmount);
      const tax = parseFloat(editTax);
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: invoice.customer_id,
          amount,
          tax,
          description: editDesc,
          due_date: editDueDate || null,
        }),
      });
      if (res.ok) fetchInvoice();
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!id) return;
    setPayLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: id,
          amount: parseFloat(payAmount),
          payment_method: payMethod,
          notes: payNotes || null,
        }),
      });
      if (res.ok) {
        setAddingPayment(false);
        setPayAmount("");
        setPayMethod("card");
        setPayNotes("");
        fetchPayments();
      }
    } finally {
      setPayLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Delete this invoice? This cannot be undone.")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    navigate("/admin/invoices");
  };

  const paidAmount = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const balance = invoice ? invoice.total - paidAmount : 0;

  const paymentCols: ColDef<PaymentRecord>[] = [
    {
      key: "created_at", label: "Date", sortable: true,
      render: (p) => (
        <span className="font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          {new Date(p.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "amount", label: "Amount", sortable: true, align: "right",
      render: (p) => <span className="font-mono text-sm font-semibold">${p.amount.toFixed(2)}</span>,
    },
    {
      key: "payment_method", label: "Method",
      render: (p) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-medium capitalize"
          style={{ background: "hsl(var(--blue) / 0.1)", color: "hsl(var(--blue))" }}
        >
          {p.payment_method || "—"}
        </span>
      ),
    },
    { key: "status", label: "Status", sortable: true, render: (p) => <StatusChip value={p.status} /> },
    {
      key: "notes", label: "Notes",
      render: (p) => <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{p.notes || "—"}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-36 rounded-2xl" />
        <div className="skeleton h-10 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-lg font-medium">Invoice not found</p>
        <Button variant="outline" onClick={() => navigate("/admin/invoices")}>Back to Revenue</Button>
      </div>
    );
  }

  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && balance > 0;

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Hero */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "hsl(var(--sidebar-bg))", border: `1px solid hsl(var(--${isOverdue ? "red" : "border"}))` }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: `hsl(var(--${isOverdue ? "red" : "amber"}) / 0.4)`, transform: "translate(30%,-30%)" }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--amber) / 0.15)", border: "1px solid hsl(var(--amber) / 0.3)", color: "hsl(var(--amber))" }}
              >
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Invoice</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">{invoice.invoice_number}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                <Calendar className="w-3.5 h-3.5" />
                Issued: {new Date(invoice.issued_date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {invoice.due_date && (
                <span
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: isOverdue ? "hsl(var(--red))" : "hsl(var(--muted-foreground))" }}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Due: {new Date(invoice.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                  {isOverdue && " · Overdue"}
                </span>
              )}
            </div>
          </div>

          {/* Total + balance */}
          <div className="flex items-end gap-6 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs mb-0.5 font-medium uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Total</p>
              <p className="text-3xl font-bold" style={{ color: "hsl(var(--amber))", fontFamily: "'DM Mono', monospace" }}>
                ${invoice.total.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs mb-0.5 font-medium uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Balance</p>
              <p
                className="text-xl font-bold"
                style={{ color: balance <= 0 ? "hsl(var(--green))" : "hsl(var(--red))", fontFamily: "'DM Mono', monospace" }}
              >
                ${Math.max(0, balance).toFixed(2)}
              </p>
            </div>
          </div>
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

      {/* Summary tab */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-elevated rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} /> Invoice Details
            </h3>
            <InfoRow label="Invoice Number" value={invoice.invoice_number} mono />
            <InfoRow label="Amount (ex tax)" value={`$${invoice.amount.toFixed(2)}`} mono />
            <InfoRow label="Tax" value={`$${invoice.tax.toFixed(2)}`} mono />
            <InfoRow label="Total" value={<span className="font-bold" style={{ color: "hsl(var(--amber))" }}>${invoice.total.toFixed(2)}</span>} />
            <InfoRow
              label="Issued"
              value={new Date(invoice.issued_date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            />
            {invoice.due_date && (
              <InfoRow
                label="Due"
                value={new Date(invoice.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
              />
            )}
            {invoice.description && (
              <div className="pt-3">
                <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Description</p>
                <p className="text-sm text-foreground">{invoice.description}</p>
              </div>
            )}
          </div>

          <div className="card-elevated rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: "hsl(var(--green))" }} /> Payment Summary
            </h3>
            <InfoRow label="Invoice Total" value={`$${invoice.total.toFixed(2)}`} mono />
            <InfoRow
              label="Amount Paid"
              value={<span style={{ color: "hsl(var(--green))" }}>${paidAmount.toFixed(2)}</span>}
            />
            <InfoRow
              label="Outstanding Balance"
              value={
                <span style={{ color: balance <= 0 ? "hsl(var(--green))" : "hsl(var(--red))" }}>
                  ${Math.max(0, balance).toFixed(2)}
                </span>
              }
            />
            <InfoRow
              label="Payments"
              value={`${payments.length} recorded`}
            />
            <div className="pt-4">
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "hsl(var(--border))" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (paidAmount / invoice.total) * 100)}%`,
                    background: "hsl(var(--green))",
                  }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                {Math.round((paidAmount / invoice.total) * 100)}% paid
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payments tab */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              All payments recorded against this invoice
            </p>
            <Button
              size="sm"
              onClick={() => setAddingPayment(true)}
              style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Record Payment
            </Button>
          </div>

          {/* Inline add-payment form */}
          {addingPayment && (
            <div
              className="rounded-xl p-5 space-y-4"
              style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--amber) / 0.3)" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "hsl(var(--amber))" }}>Record New Payment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Method</Label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full h-9 rounded-md border px-3 text-sm"
                    style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                  >
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="eft">EFT</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input placeholder="Optional" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setAddingPayment(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleAddPayment}
                  disabled={payLoading || !payAmount}
                  style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
                >
                  {payLoading ? "Saving…" : "Save Payment"}
                </Button>
              </div>
            </div>
          )}

          <DataTable<PaymentRecord>
            columns={paymentCols}
            data={payments}
            rowKey="id"
            searchPlaceholder="Search payments…"
            searchKeys={["status", "payment_method"]}
            loading={paymentsLoading}
            emptyText="No payments recorded yet."
          />
        </div>
      )}

      {/* Edit tab */}
      {activeTab === "edit" && (
        <div className="space-y-6">
          <div className="card-elevated rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} /> Edit Invoice
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (ex tax)</Label>
                <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tax</Label>
                <Input type="number" value={editTax} onChange={(e) => setEditTax(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Invoice description" />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={handleSave} disabled={saving} style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl p-5" style={{ background: "hsl(var(--red) / 0.05)", border: "1px solid hsl(var(--red) / 0.2)" }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--red))" }}>Danger Zone</h3>
            <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
              Permanently delete this invoice and all associated payments.
            </p>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg nav-transition font-medium"
              style={{ background: "hsl(var(--red) / 0.1)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red) / 0.25)" }}
            >
              <Trash2 className="w-4 h-4" /> Delete Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Exported wrapper ───────────────────────────────────────────── */
export function InvoiceDetail() {
  return (
    <AdminLayout title="Invoice">
      <InvoiceDetailInner />
    </AdminLayout>
  );
}
