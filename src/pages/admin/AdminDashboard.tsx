import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useApi } from "@/hooks/useApi";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Users, DollarSign, CheckCircle, Clock, ArrowUpRight, TrendingUp } from "lucide-react";

interface DashboardMetrics {
  total_customers: number;
  total_bookings: number;
  pending_bookings: number;
  completed_jobs_month: number;
  active_jobs: number;
  revenue_month: number;
  revenue_year: number;
}
interface TechnicianPerformance {
  technician_id: string;
  name: string;
  total_jobs: number;
  completed_jobs: number;
  completion_rate: number;
}
interface PaymentStatus { paid: number; pending: number; overdue: number; }
interface CustomerAcquisition { month: string; count: number; }

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}

function MetricCard({ title, value, icon: Icon, accent, sub }: MetricCardProps) {
  return (
    <div
      className="relative rounded-xl p-5 card-elevated overflow-hidden"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <ArrowUpRight className="w-4 h-4 opacity-30" style={{ color: "hsl(var(--muted-foreground))" }} />
      </div>
      <p className="text-xs font-medium mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
        {title}
      </p>
      <p className="metric-value text-foreground">{value}</p>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>{sub}</p>
      )}
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "hsl(222 22% 11%)",
    border: "1px solid hsl(222 18% 16%)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "hsl(210 20% 94%)",
  },
};

export function AdminDashboard() {
  const { call } = useApi();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [techPerformance, setTechPerformance] = useState<TechnicianPerformance[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [customerAcq, setCustomerAcq] = useState<CustomerAcquisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [metricsData, perfData, paymentData, custData] = await Promise.all([
          call("/analytics/dashboard-metrics"),
          call("/analytics/technician-performance"),
          call("/analytics/payment-status"),
          call("/analytics/customer-acquisition"),
        ]);
        setMetrics(metricsData);
        setTechPerformance(Array.isArray(perfData) ? perfData : []);
        setPaymentStatus(paymentData);
        setCustomerAcq(Array.isArray(custData) ? custData : []);
      } catch (err) {
        console.error("Failed to load metrics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [call]);

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="skeleton h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const metricCards: MetricCardProps[] = [
    {
      title: "Customers",
      value: metrics?.total_customers ?? 0,
      icon: Users,
      accent: "hsl(var(--blue))",
      sub: "Registered",
    },
    {
      title: "Monthly Revenue",
      value: `$${(metrics?.revenue_month ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      accent: "hsl(var(--amber))",
      sub: `$${(metrics?.revenue_year ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} YTD`,
    },
    {
      title: "Active Jobs",
      value: metrics?.active_jobs ?? 0,
      icon: Clock,
      accent: "hsl(38 90% 52%)",
      sub: `${metrics?.pending_bookings ?? 0} pending`,
    },
    {
      title: "Completed This Month",
      value: metrics?.completed_jobs_month ?? 0,
      icon: CheckCircle,
      accent: "hsl(var(--green))",
      sub: `${metrics?.total_bookings ?? 0} total bookings`,
    },
  ];

  const pieData = paymentStatus
    ? [
        { name: "Paid",    value: paymentStatus.paid    },
        { name: "Pending", value: paymentStatus.pending },
        { name: "Overdue", value: paymentStatus.overdue },
      ]
    : [];

  const PIE_COLORS = [
    "hsl(var(--green))",
    "hsl(var(--amber))",
    "hsl(var(--red))",
  ];

  return (
    <AdminLayout title="Dashboard" description="Your franchise at a glance">
      <div className="space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((m) => <MetricCard key={m.title} {...m} />)}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Customer acquisition */}
          <div
            className="rounded-xl p-5 card-elevated"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
              <p className="text-sm font-semibold text-foreground">Customer Acquisition</p>
            </div>
            {customerAcq.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={customerAcq}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Line
                    type="monotone" dataKey="count" name="Customers"
                    stroke="hsl(var(--amber))" strokeWidth={2}
                    dot={{ fill: "hsl(var(--amber))", r: 3 }}
                    activeDot={{ r: 5, fill: "hsl(var(--amber))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex items-center justify-center text-sm"
                   style={{ color: "hsl(var(--muted-foreground))" }}>
                No acquisition data yet
              </div>
            )}
          </div>

          {/* Payment status pie */}
          <div
            className="rounded-xl p-5 card-elevated"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
              <p className="text-sm font-semibold text-foreground">Invoice Status</p>
            </div>
            {pieData.some((d) => d.value > 0) ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      {...CHART_TOOLTIP_STYLE}
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="status-dot"
                          style={{ background: PIE_COLORS[i], boxShadow: `0 0 6px ${PIE_COLORS[i]}80` }}
                        />
                        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {d.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        ${d.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-sm"
                   style={{ color: "hsl(var(--muted-foreground))" }}>
                No invoice data yet
              </div>
            )}
          </div>
        </div>

        {/* Team performance */}
        <div
          className="rounded-xl p-5 card-elevated"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
            <p className="text-sm font-semibold text-foreground">Team Performance</p>
            <span className="ml-auto text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Jobs completed vs assigned
            </span>
          </div>
          {techPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={techPerformance} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="total_jobs"     name="Assigned"  fill="hsl(var(--border))"  radius={[4,4,0,0]} />
                <Bar dataKey="completed_jobs" name="Completed" fill="hsl(var(--amber))"  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm"
                 style={{ color: "hsl(var(--muted-foreground))" }}>
              No technician data available yet
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
