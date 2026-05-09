import { useState, useEffect } from "react";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, DollarSign, Zap } from "lucide-react";

interface Analytics {
  total_franchises: number;
  active_franchises: number;
  total_staff: number;
  total_bookings: number;
  total_revenue: number;
  total_jobs: number;
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
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
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
        <div className="flex items-center justify-center h-96">Loading...</div>
      </SuperadminLayout>
    );
  }

  if (!analytics) {
    return (
      <SuperadminLayout>
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          Failed to load analytics
        </div>
      </SuperadminLayout>
    );
  }

  const metrics = [
    {
      title: "Total Franchises",
      value: analytics.total_franchises,
      icon: Building2,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Active Franchises",
      value: analytics.active_franchises,
      icon: Zap,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Total Staff",
      value: analytics.total_staff,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Total Revenue",
      value: `$${(analytics.total_revenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <SuperadminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and analytics</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {metric.title}
                    </CardTitle>
                    <div className={`p-2 rounded ${metric.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {analytics.total_bookings}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Across all franchises
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Completed Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {analytics.total_jobs}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Successfully completed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperadminLayout>
  );
}
