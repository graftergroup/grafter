import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StaffForm } from "@/components/StaffForm";
import type { StaffFormData } from "@/components/StaffForm";
import { DataTable, StatusChip, Avatar } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Mail, Copy, Check } from "lucide-react";

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
  const navigate = useNavigate();

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState("technician");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleSendInvite = async () => {
    setInviteLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          first_name: inviteFirstName,
          last_name: inviteLastName,
          role: inviteRole,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setInviteLink(data.invite_url);
        fetchStaff();
      } else {
        const err = await response.json();
        alert(err.detail || "Failed to create invite");
      }
    } catch {
      alert("Failed to create invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetInviteDialog = () => {
    setInviteEmail("");
    setInviteFirstName("");
    setInviteLastName("");
    setInviteRole("technician");
    setInviteLink(null);
    setCopied(false);
  };

  const columns: ColDef<StaffMember>[] = [
    {
      key: "first_name",
      label: "Name",
      sortable: true,
      render: (m) => (
        <button
          onClick={() => navigate(`/admin/staff/${m.id}`)}
          className="text-left nav-transition hover:opacity-80"
        >
          <Avatar name={`${m.first_name} ${m.last_name}`} sub={m.email} />
        </button>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (m) => (
        <span style={{ color: "hsl(var(--muted-foreground))", fontFamily: "'DM Mono', monospace", fontSize: "0.8rem" }}>
          {m.phone || "—"}
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
    <AdminLayout title="Staff Management" description="Manage your franchise staff members">
      <div className="space-y-6">
        <div className="flex justify-end gap-2">
          {/* Invite Staff Dialog */}
          <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) resetInviteDialog(); }}>
            <DialogTrigger asChild>
              <Button variant="outline"><Mail className="w-4 h-4 mr-2" />Invite Staff</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Staff Member</DialogTitle>
              </DialogHeader>
              {!inviteLink ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>First Name</Label>
                      <Input value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} placeholder="Jane" />
                    </div>
                    <div className="space-y-1">
                      <Label>Last Name</Label>
                      <Input value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} placeholder="Smith" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@example.com" />
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="office_staff">Office Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleSendInvite} disabled={inviteLoading || !inviteEmail || !inviteFirstName || !inviteLastName}>
                    {inviteLoading ? "Generating..." : "Generate Invite Link"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">Share this link with <strong>{inviteEmail}</strong>. It expires in 72 hours.</p>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} className="text-xs" />
                    <Button variant="outline" size="icon" onClick={handleCopyLink}>
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full" onClick={resetInviteDialog}>Invite Another</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <StaffForm
            onSubmit={handleCreateStaff}
            isSuperadmin={false}
            buttonLabel="Add Staff Member"
          />
        </div>

        <DataTable
          columns={columns}
          data={staff}
          rowKey="id"
          searchPlaceholder="Search by name or email…"
          searchKeys={["first_name", "last_name", "email"]}
          loading={loading}
          emptyText="No staff members yet. Add or invite one to get started."
        />
      </div>
    </AdminLayout>
  );
}
