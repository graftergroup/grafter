import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useApi } from "@/hooks/useApi";
import type { User } from "@/types";
import { DataTable, Avatar, StatusChip, ProgressBar } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, CheckCircle, Clock, Users, Zap, TrendingUp } from "lucide-react";

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

  interface PerfRow {
    technician_id: string;
    name: string;
    total_jobs: number;
    completed_jobs: number;
    completion_rate: number;
  }

  const columns: ColDef<PerfRow>[] = [
    {
      key: "name",
      label: "Technician",
      sortable: true,
      render: (t) => <Avatar name={t.name} />,
    },
    {
      key: "total_jobs",
      label: "Assigned",
      sortable: true,
      align: "right",
      render: (t) => <span className="tabular-nums text-sm text-foreground">{t.total_jobs}</span>,
    },
    {
      key: "completed_jobs",
      label: "Completed",
      sortable: true,
      align: "right",
      render: (t) => (
        <span className="tabular-nums text-sm" style={{ color: "hsl(var(--green))" }}>{t.completed_jobs}</span>
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
      key: "technician_id",
      label: "Status",
      render: (t) => <StatusChip value={t.total_jobs > 0 ? "active" : "inactive"} />,
    },
    {
      key: "actions" as keyof PerfRow,
      label: "",
      align: "right",
      render: () => (
        <div className="flex justify-end gap-1">
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

  return (
    <AdminLayout title="Team Management" description="Manage your technicians and workload">
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Technicians",    value: performance.length, icon: Users,      accent: "hsl(var(--blue))"  },
            { label: "Jobs Assigned",  value: totalJobs,          icon: Zap,        accent: "hsl(var(--amber))" },
            { label: "Completed",      value: completedJobs,      icon: CheckCircle,accent: "hsl(var(--green))" },
            { label: "Avg Completion", value: `${avgCompletion}%`,icon: TrendingUp, accent: "hsl(38 90% 52%)"   },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="rounded-xl p-4 card-elevated flex items-center gap-3"
                 style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
              <div>
                <p className="metric-value text-foreground" style={{ fontSize: "1.4rem" }}>{value}</p>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Technician</Button>
        </div>

        <DataTable
          columns={columns}
          data={performance}
          rowKey="technician_id"
          loading={isLoading}
          emptyText="No technicians assigned yet"
        />
      </div>
    </AdminLayout>
  );
}
