import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useApi } from "@/hooks/useApi";
import type { User } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TechnicianData extends User {
  total_jobs?: number;
  completed_jobs?: number;
  completion_rate?: number;
}

export function TeamManagement() {
  const { call } = useApi();
  const [technicians, setTechnicians] = useState<TechnicianData[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [perfData] = await Promise.all([call("/analytics/technician-performance")]);

        setPerformance(Array.isArray(perfData) ? perfData : []);
      } catch (err) {
        console.error("Failed to load team data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [call]);

  if (isLoading) {
    return (
      <AdminLayout title="Team Management" description="Manage your technicians and workload">
        <div className="flex items-center justify-center h-96">Loading team data...</div>
      </AdminLayout>
    );
  }

  const totalJobs = performance.reduce((sum, tech) => sum + tech.total_jobs, 0);
  const completedJobs = performance.reduce((sum, tech) => sum + tech.completed_jobs, 0);
  const avgCompletion =
    performance.length > 0
      ? (performance.reduce((sum, tech) => sum + tech.completion_rate, 0) / performance.length).toFixed(1)
      : 0;

  return (
    <AdminLayout title="Team Management" description="Manage your technicians and workload">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.length}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedJobs}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompletion}%</div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>
      </div>

      {/* Technician Performance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Technician Performance</CardTitle>
            <CardDescription>Job assignments and completion rates</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Technician
          </Button>
        </CardHeader>
        <CardContent>
          {performance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No technicians assigned yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Total Jobs</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.map((tech) => (
                    <TableRow key={tech.technician_id}>
                      <TableCell className="font-medium">{tech.name}</TableCell>
                      <TableCell>{tech.total_jobs}</TableCell>
                      <TableCell className="text-green-600">{tech.completed_jobs}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${tech.completion_rate}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {tech.completion_rate.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tech.total_jobs > 0 ? "default" : "secondary"}
                        >
                          {tech.total_jobs > 0 ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {tech.total_jobs > 0 ? "Active" : "Idle"}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
