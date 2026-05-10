import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

  return (
    <AdminLayout title="Staff Performance" description="Per-technician job completion and revenue metrics">
      {loading ? (
        <div className="flex items-center justify-center h-96">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Technicians</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Jobs Assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalAssigned}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{avgCompletion}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Est. Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">£{totalRevenue.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {data.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No technician data yet. Assign jobs to staff members to see performance metrics.
            </div>
          ) : (
            <>
              {/* Bar chart — jobs completed per technician */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Jobs Completed per Technician</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: string) => v.split(" ")[0]}
                      />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(val: number) => [val, "Completed"]}
                        labelFormatter={(label: string) => `Technician: ${label}`}
                      />
                      <Bar dataKey="total_completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Detail table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead>Technician</TableHead>
                        <TableHead className="text-right">Assigned</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Est. Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((tech) => (
                        <TableRow key={tech.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tech.name}</p>
                              <p className="text-xs text-muted-foreground">{tech.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{tech.total_assigned}</TableCell>
                          <TableCell className="text-right">{tech.total_completed}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                tech.completion_rate >= 80
                                  ? "default"
                                  : tech.completion_rate >= 50
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {tech.completion_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            £{tech.estimated_revenue.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
