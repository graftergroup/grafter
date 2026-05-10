import { useState, useEffect } from "react";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { Building2, Users, DollarSign, Zap, ArrowUpRight, Activity } from "lucide-react";

interface Analytics {
  total_franchises: number;
  active_franchises: number;
  total_staff: number;
  total_bookings: number;
  total_revenue: number;
  total_jobs: number;
}

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
      className="relative rounded-xl p-5 flex flex-col gap-4 card-elevated overflow-hidden"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      {/* Glow orb */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: accent }}
      />

      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] opacity-40" />
      </div>

      <div>
        <p className="text-xs font-medium mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
          {title}
        </p>
        <p className="metric-value" style={{ color: "hsl(var(--foreground))" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export function SuperadminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch("/api/superadmin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) setAnalytics(await response.json());
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <SuperadminLayout>
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="skeleton h-7 w-40 rounded" />
            <div className="skeleton h-4 w-56 rounded mt-2" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-xl" />
            ))}
          </div>
        </div>
      </SuperadminLayout>
    );
  }

  if (!analytics) {
    return (
      <SuperadminLayout>
        <div className="flex items-center justify-center h-64 text-[hsl(var(--muted-foreground))]">
          Failed to load analytics
        </div>
      </SuperadminLayout>
    );
  }

  const metrics: MetricCardProps[] = [
    {
      title: "Total Franchises",
      value: analytics.total_franchises,
      icon: Building2,
      accent: "hsl(var(--blue))",
      sub: `${analytics.active_franchises} active`,
    },
    {
      title: "Active Franchises",
      value: analytics.active_franchises,
      icon: Zap,
      accent: "hsl(var(--green))",
      sub: "Approved & running",
    },
    {
      title: "Total Staff",
      value: analytics.total_staff,
      icon: Users,
      accent: "hsl(var(--amber))",
      sub: "Across all locations",
    },
    {
      title: "Total Revenue",
      value: `$${(analytics.total_revenue || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      accent: "hsl(38 90% 52%)",
      sub: "Platform lifetime",
    },
  ];

  return (
    <SuperadminLayout>
      <div className="space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Platform Overview</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Real-time snapshot across all franchises
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
               style={{ background: "hsl(var(--green) / 0.1)", border: "1px solid hsl(var(--green) / 0.3)", color: "hsl(var(--green))" }}>
            <Activity className="w-3 h-3" />
            Live
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <MetricCard key={m.title} {...m} />
          ))}
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            className="rounded-xl p-5 card-elevated"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Total Bookings
            </p>
            <p className="metric-value text-foreground">{analytics.total_bookings.toLocaleString()}</p>
            <p className="text-xs mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
              Across all franchises
            </p>
            <div
              className="mt-4 h-1.5 rounded-full overflow-hidden"
              style={{ background: "hsl(var(--border))" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (analytics.total_jobs / Math.max(1, analytics.total_bookings)) * 100)}%`,
                  background: "hsl(var(--amber))",
                }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              {analytics.total_jobs} completed ·{" "}
              {Math.round((analytics.total_jobs / Math.max(1, analytics.total_bookings)) * 100)}% completion rate
            </p>
          </div>

          <div
            className="rounded-xl p-5 card-elevated"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Completed Jobs
            </p>
            <p className="metric-value text-foreground">{analytics.total_jobs.toLocaleString()}</p>
            <p className="text-xs mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
              Successfully delivered
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span
                className="status-dot status-dot-green"
              />
              <span className="text-xs" style={{ color: "hsl(var(--green))" }}>
                Platform operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </SuperadminLayout>
  );
}
