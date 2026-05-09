import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useApi } from "@/hooks/useApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, DollarSign, CheckCircle, Clock } from "lucide-react";

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

interface PaymentStatus {
  paid: number;
  pending: number;
  overdue: number;
}

interface CustomerAcquisition {
  month: string;
  count: number;
}

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
      <AdminLayout title="Dashboard" description="Welcome back! Here's your business overview.">
        <div className="flex items-center justify-center h-96">Loading metrics...</div>
      </AdminLayout>
    );
  }

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))"];

  return (
    <AdminLayout title="Dashboard" description="Welcome back! Here's your business overview.">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Revenue (This Month)"
          value={`$${metrics?.revenue_month.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          }) || "0"}`}
          icon={DollarSign}
          description="Month-to-date revenue"
        />
        <MetricCard
          title="Total Customers"
          value={metrics?.total_customers || 0}
          icon={Users}
          description="Active customers"
        />
        <MetricCard
          title="Completed Jobs"
          value={metrics?.completed_jobs_month || 0}
          icon={CheckCircle}
          description="This month"
        />
        <MetricCard
          title="Active Jobs"
          value={metrics?.active_jobs || 0}
          icon={Clock}
          description="In progress"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Customer Acquisition Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Acquisition</CardTitle>
            <CardDescription>New customers over time</CardDescription>
          </CardHeader>
          <CardContent>
            {customerAcq.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={customerAcq}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Invoice payment breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentStatus && (paymentStatus.paid + paymentStatus.pending + paymentStatus.overdue > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Paid", value: paymentStatus.paid },
                      { name: "Pending", value: paymentStatus.pending },
                      { name: "Overdue", value: paymentStatus.overdue },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2].map((index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No invoices yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Technician Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Technician job completion rates</CardDescription>
        </CardHeader>
        <CardContent>
          {techPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={techPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_jobs" fill="hsl(var(--primary))" name="Total Jobs" />
                <Bar dataKey="completed_jobs" fill="hsl(var(--secondary))" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No technician data available
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
}

function MetricCard({ title, value, icon: Icon, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
