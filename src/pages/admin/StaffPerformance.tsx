import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Avatar, ProgressBar } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, CheckCircle, TrendingUp, DollarSign, ArrowUpRight } from "lucide-react";

interface TechPerformance {
  id: string;
  name: string;
  email: string;
  staff_type: string | null;
  total_assigned: number;
  total_completed: number;
  completion_rate: number;
  estimated_revenue: number;
}

export function StaffPerformance() {
  const [data, setData] = useState<TechPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch("/api/analytics/staff-performance", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalCompleted = data.reduce((s, d) => s + d.total_completed, 0);
  const totalAssigned = data.reduce((s, d) => s + d.total_assigned, 0);
  const avgCompletion =
    data.length > 0
      ? Math.round(data.reduce((s, d) => s + d.completion_rate, 0) / data.length)
      : 0;
  const totalRevenue = data.reduce((s, d) => s + d.estimated_revenue, 0);

  const columns: ColDef<TechPerformance>[] = [
    {
      key: "name",
      label: "Technician",
      sortable: true,
      render: (t) => <Avatar name={t.name} sub={t.email} />,
    },
    {
      key: "total_assigned",
      label: "Assigned",
      sortable: true,
      align: "right",
      render: (t) => (
        <span className="tabular-nums text-sm text-foreground">{t.total_assigned}</span>
      ),
    },
    {
      key: "total_completed",
      label: "Completed",
      sortable: true,
      align: "right",
      render: (t) => (
        <span className="tabular-nums text-sm" style={{ color: "hsl(var(--green))" }}>{t.total_completed}</span>
      ),
    },
    {
      key: "completion_rate",
      label: "Completion Rate",
      sortable: true,
      className: "min-w-[160px]",
      render: (t) => <ProgressBar value={t.completion_rate} />,
    },
    {
      key: "estimated_revenue",
      label: "Est. Revenue",
      sortable: true,
      align: "right",
      render: (t) => (
        <span className="tabular-nums text-sm font-semibold" style={{ color: "hsl(var(--amber))" }}>
          £{t.estimated_revenue.toLocaleString()}
        </span>
      ),
    },
  ];

  const CHART_TOOLTIP_STYLE = {
    contentStyle: {
      background: "hsl(222 22% 11%)",
      border: "1px solid hsl(222 18% 16%)",
      borderRadius: "8px",
      fontSize: "12px",
      color: "hsl(210 20% 94%)",
    },
  };

  const summaryCards = [
    { label: "Technicians",        value: data.length,              icon: Users,       accent: "hsl(var(--blue))"  },
    { label: "Jobs Assigned",      value: totalAssigned,            icon: CheckCircle, accent: "hsl(var(--amber))" },
    { label: "Avg Completion",     value: `${avgCompletion}%`,      icon: TrendingUp,  accent: "hsl(var(--green))" },
    { label: "Est. Revenue",       value: `£${totalRevenue.toLocaleString()}`, icon: DollarSign, accent: "hsl(38 90% 52%)" },
  ];

  return (
    <AdminLayout title="Staff Performance" description="Per-technician job completion and revenue metrics">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className="rounded-xl p-5 card-elevated relative overflow-hidden"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl pointer-events-none"
                   style={{ background: accent }} />
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                     style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-30" style={{ color: "hsl(var(--muted-foreground))" }} />
              </div>
              <p className="text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
              <p className="metric-value text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {data.length > 0 && (
          <div
            className="rounded-xl p-5 card-elevated"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <p className="text-sm font-semibold text-foreground mb-4">Jobs Completed per Technician</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.split(" ")[0]}
                />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(val: number) => [val, "Completed"]} />
                <Bar dataKey="total_completed" fill="hsl(var(--amber))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <DataTable
          columns={columns}
          data={data}
          rowKey="id"
          loading={loading}
          emptyText="No technician data yet. Assign jobs to staff members to see performance metrics."
        />
      </div>
    </AdminLayout>
  );
}
