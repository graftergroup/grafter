import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StaffForm, StaffFormData } from "@/components/StaffForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2 } from "lucide-react";

interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  staff_type?: string;
  is_active: boolean;
}

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your franchise staff members
            </p>
          </div>

          <StaffForm
            onSubmit={handleCreateStaff}
            isSuperadmin={false}
            buttonLabel="Add Staff Member"
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.first_name} {member.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>{member.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {member.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.is_active ? "default" : "secondary"}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStaff(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredStaff.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No staff members. Create one to get started.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
