import { useState, useEffect } from "react";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";

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

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Billing & Commission</h2>
          <p className="text-muted-foreground text-sm mt-1">Track franchise revenue and platform commission</p>
        </div>
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Franchises</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{franchises.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commission Pending</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-amber-500">{fmt(totalPending)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commission Collected</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{fmt(totalPaid)}</p></CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
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

        {/* Billing records table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No billing records yet. Generate a billing period to get started.
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Franchise</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Gross Revenue</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">{rec.franchise_name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDate(rec.period_start)} – {fmtDate(rec.period_end)}
                      </TableCell>
                      <TableCell className="text-right">{fmt(rec.gross_revenue)}</TableCell>
                      <TableCell className="text-right">{(rec.commission_rate * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-medium">{fmt(rec.commission_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[rec.status] ?? "outline"}>
                          {rec.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rec.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(rec.id, "invoiced")}>
                            Mark Invoiced
                          </Button>
                        )}
                        {rec.status === "invoiced" && (
                          <Button size="sm" onClick={() => handleStatusUpdate(rec.id, "paid")}>
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </SuperadminLayout>
  );
}
