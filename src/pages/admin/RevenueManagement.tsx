import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useApi } from "@/hooks/useApi";
import type { Invoice, Payment } from "@/types";
import { DataTable, StatusChip } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { SearchFilter } from "@/components/admin/SearchFilter";

const ITEMS_PER_PAGE = 10;

export function RevenueManagement() {
  const { call } = useApi();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [invoicesData, paymentsData] = await Promise.all([
          call("/invoices"),
          call("/payments"),
        ]);

        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      } catch (err) {
        console.error("Failed to load revenue data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [call]);

  // Filter and paginate invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.customer_id.toString().includes(invoiceSearch.toLowerCase())
    );
  }, [invoices, invoiceSearch]);

  const invoiceTotalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (invoicePage - 1) * ITEMS_PER_PAGE,
    invoicePage * ITEMS_PER_PAGE
  );

  // Filter and paginate payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) =>
      p.invoice_id.toString().includes(paymentSearch.toLowerCase())
    );
  }, [payments, paymentSearch]);

  const paymentTotalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice(
    (paymentPage - 1) * ITEMS_PER_PAGE,
    paymentPage * ITEMS_PER_PAGE
  );

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidAmount = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = totalRevenue - paidAmount;

  if (isLoading) {
    return (
      <AdminLayout title="Revenue Management" description="Manage invoices and payments">
        <div className="flex items-center justify-center h-96">Loading revenue data...</div>
      </AdminLayout>
    );
  }

  const invoiceCols: ColDef<Invoice>[] = [
    {
      key: "invoice_number",
      label: "Invoice #",
      sortable: true,
      render: (inv) => (
        <button
          onClick={() => navigate(`/admin/invoices/${inv.id}`)}
          className="nav-transition hover:opacity-80"
        >
          <span className="text-xs tabular-nums font-medium underline-offset-2 hover:underline"
                style={{ fontFamily: "'DM Mono', monospace", color: "hsl(var(--amber))" }}>
            {inv.invoice_number}
          </span>
        </button>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      align: "right",
      render: (inv) => (
        <span className="tabular-nums text-sm text-foreground">${inv.amount.toFixed(2)}</span>
      ),
    },
    {
      key: "tax",
      label: "Tax",
      align: "right",
      render: (inv) => (
        <span className="tabular-nums text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>${inv.tax.toFixed(2)}</span>
      ),
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      align: "right",
      render: (inv) => (
        <span className="tabular-nums text-sm font-semibold" style={{ color: "hsl(var(--amber))" }}>${inv.total.toFixed(2)}</span>
      ),
    },
    {
      key: "due_date",
      label: "Due",
      sortable: true,
      render: (inv) => (
        <span className="text-xs tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "id",
      label: "",
      align: "right",
      render: () => (
        <div className="flex justify-end gap-1">
          <button className="w-7 h-7 rounded-md flex items-center justify-center nav-transition
                             text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--accent))]">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 rounded-md flex items-center justify-center nav-transition
                             text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--accent))]">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 rounded-md flex items-center justify-center nav-transition
                             text-[hsl(var(--muted-foreground))] hover:text-destructive hover:bg-[hsl(var(--destructive)/0.1)]">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const paymentCols: ColDef<Payment>[] = [
    {
      key: "invoice_id",
      label: "Invoice",
      render: (p) => (
        <span className="text-xs tabular-nums" style={{ fontFamily: "'DM Mono', monospace", color: "hsl(var(--muted-foreground))" }}>
          #{String(p.invoice_id).slice(0, 8)}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      align: "right",
      render: (p) => (
        <span className="tabular-nums text-sm font-semibold" style={{ color: "hsl(var(--green))" }}>${p.amount.toFixed(2)}</span>
      ),
    },
    {
      key: "payment_method",
      label: "Method",
      render: (p) => (
        <span className="text-sm text-foreground">{p.payment_method || "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (p) => <StatusChip value={p.status} />,
    },
    {
      key: "created_at",
      label: "Date",
      sortable: true,
      render: (p) => (
        <span className="text-xs tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
          {new Date(p.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "id",
      label: "",
      align: "right",
      render: () => (
        <button className="w-7 h-7 rounded-md flex items-center justify-center nav-transition
                           text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--accent))]">
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <AdminLayout title="Revenue Management" description="Manage invoices and payments">
      <div className="space-y-8">
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`,  accent: "hsl(var(--amber))" },
            { label: "Paid",          value: `$${paidAmount.toFixed(2)}`,    accent: "hsl(var(--green))" },
            { label: "Pending",       value: `$${pendingAmount.toFixed(2)}`,  accent: "hsl(var(--amber))" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-xl p-4 card-elevated"
                 style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
              <p className="metric-value" style={{ color: accent }}>{value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Invoices</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Invoice</Button>
          </div>
          <DataTable
            columns={invoiceCols}
            data={filteredInvoices}
            rowKey="id"
            searchPlaceholder="Search invoices…"
            searchKeys={["invoice_number"]}
            loading={isLoading}
            emptyText="No invoices yet"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Payments</p>
          </div>
          <DataTable
            columns={paymentCols}
            data={filteredPayments}
            rowKey="id"
            loading={isLoading}
            emptyText="No payments recorded"
          />
        </div>
      </div>
    </AdminLayout>
  );
}
