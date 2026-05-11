import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ModuleGate } from "@/components/ModuleGate";
import { DataTable, StatusChip, Avatar } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  staff_type: string | null;
  is_active: boolean;
  created_at: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  franchise_manager: "Manager",
  office_staff: "Office",
  technician: "Technician",
  admin: "Admin",
};

export default function HREmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = () => localStorage.getItem("access_token");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/hr/employees", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setEmployees(await res.json());
      setLoading(false);
    };
    load();
  }, []);

  const columns: ColDef<Employee>[] = [
    {
      key: "first_name",
      label: "Employee",
      sortable: true,
      render: (e) => (
        <button
          onClick={() => navigate(`/admin/hr/employees/${e.id}`)}
          className="text-left hover:opacity-80 nav-transition"
        >
          <Avatar name={`${e.first_name} ${e.last_name}`} sub={e.email} />
        </button>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (e) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-medium capitalize"
          style={{ background: "hsl(var(--blue) / 0.1)", color: "hsl(var(--blue))" }}
        >
          {ROLE_LABELS[e.role] ?? e.role.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "staff_type",
      label: "Type",
      render: (e) => (
        <span className="text-sm capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>
          {e.staff_type ?? "—"}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (e) => <StatusChip value={e.is_active ? "active" : "inactive"} />,
    },
    {
      key: "created_at",
      label: "Joined",
      sortable: true,
      render: (e) => (
        <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          {e.created_at ? new Date(e.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <ModuleGate slug="hr" moduleName="HR Module">
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <UserCheck className="w-6 h-6" style={{ color: "hsl(var(--amber))" }} />
                Employees
              </h1>
              <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                All staff members in your franchise
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/admin/staff")}
              style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invite Employee
            </Button>
          </div>

          <DataTable<Employee>
            columns={columns}
            data={employees}
            rowKey="id"
            searchPlaceholder="Search employees…"
            searchKeys={["first_name", "last_name", "email"]}
            loading={loading}
            emptyText="No employees found."
          />
        </div>
      </ModuleGate>
    </AdminLayout>
  );
}
