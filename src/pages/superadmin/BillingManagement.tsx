import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, StatusChip } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { RefreshCw, DollarSign, Building2, TrendingUp } from "lucide-react";

interface Franchise {
  id: string;
  name: string;
  commission_rate: number;
  billing_email: string | null;
}

interface BillingRecord {
  id: string;
  franchise_id: string;
  franchise_name: string | null;
  period_start: string;
  period_end: string;
  gross_revenue: number;
  commission_rate: number;
  commission_amount: number;
  module_fees: number;
  status: string;
  notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  invoiced: "outline",
  paid: "default",
};

export function BillingManagement() {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Generate dialog
  const [genOpen, setGenOpen] = useState(false);
  const [genStart, setGenStart] = useState("");
  const [genEnd, setGenEnd] = useState("");
  const [genFranchise, setGenFranchise] = useState("all");
  const [genLoading, setGenLoading] = useState(false);

  const token = () => localStorage.getItem("access_token");

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/billing", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setRecords(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchFranchises = async () => {
    const res = await fetch("/api/superadmin/franchises", {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) setFranchises(await res.json());
  };

  useEffect(() => {
    fetchRecords();
    fetchFranchises();
  }, []);

  const handleGenerate = async () => {
    setGenLoading(true);
    try {
      const body: Record<string, unknown> = {
        period_start: new Date(genStart).toISOString(),
        period_end: new Date(genEnd).toISOString(),
      };
      if (genFranchise !== "all") body.franchise_id = genFranchise;

      const res = await fetch("/api/superadmin/billing/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setGenOpen(false);
        setGenStart("");
        setGenEnd("");
        setGenFranchise("all");
        fetchRecords();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to generate billing");
      }
    } finally {
      setGenLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const res = await fetch(`/api/superadmin/billing/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchRecords();
  };

  const totalPending = records.filter((r) => r.status === "pending").reduce((s, r) => s + r.commission_amount, 0);
  const totalPaid = records.filter((r) => r.status === "paid").reduce((s, r) => s + r.commission_amount, 0);

  const fmt = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const columns: ColDef<BillingRecord>[] = [
    {
      key: "franchise_name",
      label: "Franchise",
      sortable: true,
      render: (r) => (
        <button
          onClick={() => navigate(`/superadmin/franchises/${r.franchise_id}`)}
          className="text-left nav-transition hover:opacity-80 flex items-center gap-2 group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              background: "hsl(var(--amber) / 0.12)",
              border: "1px solid hsl(var(--amber) / 0.25)",
              color: "hsl(var(--amber))",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {(r.franchise_name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <span
            className="text-sm font-medium underline-offset-2 group-hover:underline"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {r.franchise_name ?? "—"}
          </span>
        </button>
      ),
    },
    {
      key: "period_start",
      label: "Period",
      sortable: true,
      render: (r) => (
        <span className="text-xs tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
          {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
        </span>
      ),
    },
    {
      key: "gross_revenue",
      label: "Gross Revenue",
      sortable: true,
      align: "right",
      render: (r) => (
        <span className="text-sm tabular-nums font-medium text-foreground">{fmt(r.gross_revenue)}</span>
      ),
    },
    {
      key: "commission_rate",
      label: "Rate",
      align: "right",
      render: (r) => (
        <span className="text-xs tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
          {(r.commission_rate * 100).toFixed(0)}%
        </span>
      ),
    },
    {
      key: "commission_amount",
      label: "Commission",
      sortable: true,
      align: "right",
      render: (r) => (
        <span className="text-sm tabular-nums font-semibold" style={{ color: "hsl(var(--amber))" }}>
          {fmt(r.commission_amount)}
        </span>
      ),
    },
    {
      key: "module_fees",
      label: "Module Fees",
      sortable: true,
      align: "right",
      render: (r) => (
        <span
          className="text-sm tabular-nums font-medium"
          style={{ color: r.module_fees > 0 ? "hsl(var(--blue))" : "hsl(var(--muted-foreground))" }}
        >
          {fmt(r.module_fees ?? 0)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => <StatusChip value={r.status} />,
    },
    {
      key: "id",
      label: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end">
          {r.status === "pending" && (
            <button
              onClick={() => handleStatusUpdate(r.id, "invoiced")}
              className="text-xs px-3 py-1.5 rounded-md nav-transition font-medium"
              style={{
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--muted-foreground))",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--amber))";
                (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--amber))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
                (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
              }}
            >
              Mark Invoiced
            </button>
          )}
          {r.status === "invoiced" && (
            <button
              onClick={() => handleStatusUpdate(r.id, "paid")}
              className="text-xs px-3 py-1.5 rounded-md nav-transition font-medium"
              style={{
                background: "hsl(var(--amber) / 0.15)",
                color: "hsl(var(--amber))",
                border: "1px solid hsl(var(--amber) / 0.35)",
              }}
            >
              Mark Paid
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Billing & Commission</h2>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Track franchise revenue and platform commission
            </p>
          </div>
          <Dialog open={genOpen} onOpenChange={setGenOpen}>
            <DialogTrigger asChild>
              <Button><RefreshCw className="w-4 h-4 mr-2" />Generate Billing Period</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Generate Billing Records</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Period Start</Label>
                    <Input type="date" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Period End</Label>
                    <Input type="date" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Franchise</Label>
                  <Select value={genFranchise} onValueChange={setGenFranchise}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Active Franchises</SelectItem>
                      {franchises.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleGenerate} disabled={genLoading || !genStart || !genEnd}>
                  {genLoading ? "Generating..." : "Generate"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Franchises", value: franchises.length, icon: Building2, accent: "hsl(var(--blue))" },
            { label: "Commission Pending", value: fmt(totalPending), icon: TrendingUp, accent: "hsl(var(--amber))" },
            { label: "Commission Collected", value: fmt(totalPaid), icon: DollarSign, accent: "hsl(var(--green))" },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className="rounded-xl p-4 card-elevated"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                     style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
                <p className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
              </div>
              <p className="metric-value text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={records}
          rowKey="id"
          loading={loading}
          emptyText="No billing records yet. Generate a billing period to get started."
        />
      </div>
    </SuperadminLayout>
  );
}
