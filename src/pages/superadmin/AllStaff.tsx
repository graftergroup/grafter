import { useState, useEffect } from "react";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { StaffForm } from "@/components/StaffForm";
import type { StaffFormData } from "@/components/StaffForm";
import { DataTable, StatusChip, Avatar } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Trash2 } from "lucide-react";

interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  staff_type?: string;
  is_active: boolean;
  franchise_id: string;
}

interface Franchise {
  id: string;
  name: string;
}

export function AllStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/staff", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
        setFilteredStaff(data);
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchFranchises = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/superadmin/franchises", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFranchises(data);
      }
    } catch (error) {
      console.error("Error fetching franchises:", error);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchStaff(), fetchFranchises()]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStaff(staff);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredStaff(
        staff.filter(
          (s) =>
            s.first_name.toLowerCase().includes(term) ||
            s.last_name.toLowerCase().includes(term) ||
            s.email.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, staff]);

  const handleCreateStaff = async (data: StaffFormData) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        fetchStaff();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || "Failed to create staff"}`);
      }
    } catch (error) {
      console.error("Error creating staff:", error);
      alert("Failed to create staff");
    }
  };

  const handleDeleteStaff = async (userId: string) => {
    if (!confirm("Are you sure? This will deactivate the staff member.")) return;

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/staff/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchStaff();
      }
    } catch (error) {
      console.error("Error deleting staff:", error);
    }
  };

  const getFranchiseName = (franchiseId: string) => {
    const f = franchises.find((f) => f.id === franchiseId);
    return f ? f.name : "Unknown";
  };

  const columns: ColDef<StaffMember>[] = [
    {
      key: "first_name",
      label: "Name",
      sortable: true,
      render: (m) => <Avatar name={`${m.first_name} ${m.last_name}`} sub={m.email} />,
    },
    {
      key: "franchise_id",
      label: "Franchise",
      sortable: true,
      render: (m) => (
        <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          {getFranchiseName(m.franchise_id)}
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (m) => <StatusChip value={m.role} />,
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (m) => <StatusChip value={m.is_active ? "active" : "inactive"} />,
    },
    {
      key: "id",
      label: "",
      align: "right",
      render: (m) => (
        <button
          onClick={() => handleDeleteStaff(m.id)}
          className="w-7 h-7 rounded-md flex items-center justify-center nav-transition
                     text-[hsl(var(--muted-foreground))] hover:text-destructive
                     hover:bg-[hsl(var(--destructive)/0.1)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">All Staff</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Manage staff across all franchises
            </p>
          </div>
          <StaffForm
            onSubmit={handleCreateStaff}
            isSuperadmin
            franchises={franchises}
            buttonLabel="Add Staff"
          />
        </div>

        <DataTable
          columns={columns}
          data={staff}
          rowKey="id"
          searchPlaceholder="Search by name or email…"
          searchKeys={["first_name", "last_name", "email"]}
          loading={loading}
          emptyText="No staff members found"
        />
      </div>
    </SuperadminLayout>
  );
}
