import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ModuleGate } from "@/components/ModuleGate";
import { DataTable, StatusChip, Avatar } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserCheck, UserPlus, Mail, Copy, Check, Trash2 } from "lucide-react";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
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

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast] = useState("");
  const [inviteRole, setInviteRole] = useState("technician");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const token = () => localStorage.getItem("access_token");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/employees", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setEmployees(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeactivate = async (emp: Employee) => {
    if (!confirm(`Deactivate ${emp.first_name} ${emp.last_name}? They will lose access.`)) return;
    await fetch(`/api/staff/${emp.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    load();
  };

  const handleSendInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          first_name: inviteFirst,
          last_name: inviteLast,
          role: inviteRole,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.invite_url);
        load();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to create invite");
      }
    } catch {
      alert("Failed to create invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetInvite = () => {
    setInviteEmail(""); setInviteFirst(""); setInviteLast("");
    setInviteRole("technician"); setInviteLink(null); setCopied(false);
  };

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
      key: "phone",
      label: "Phone",
      render: (e) => (
        <span style={{ color: "hsl(var(--muted-foreground))", fontFamily: "'DM Mono', monospace", fontSize: "0.8rem" }}>
          {e.phone ?? "—"}
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
          {e.created_at ? new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </span>
      ),
    },
    {
      key: "id",
      label: "",
      align: "right",
      render: (e) => (
        <button
          onClick={() => handleDeactivate(e)}
          title="Deactivate"
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
              onClick={() => { resetInvite(); setInviteOpen(true); }}
              style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Employee
            </Button>
          </div>

          <DataTable<Employee>
            columns={columns}
            data={employees}
            rowKey="id"
            searchPlaceholder="Search employees…"
            searchKeys={["first_name", "last_name", "email"]}
            loading={loading}
            emptyText="No employees found. Invite your first team member."
          />

          {/* Invite dialog */}
          <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) resetInvite(); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-4 h-4" style={{ color: "hsl(var(--amber))" }} />
                  Invite Employee
                </DialogTitle>
              </DialogHeader>

              {inviteLink ? (
                <div className="space-y-4 pt-2">
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Invite link created. Share this link with the new employee:
                  </p>
                  <div
                    className="flex items-center gap-2 p-3 rounded-lg text-xs font-mono break-all"
                    style={{ background: "hsl(var(--accent))", border: "1px solid hsl(var(--border))" }}
                  >
                    <span className="flex-1 truncate">{inviteLink}</span>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 nav-transition"
                      style={{ color: copied ? "hsl(var(--green))" : "hsl(var(--amber))" }}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => { resetInvite(); setInviteOpen(false); }}>
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>First Name</Label>
                      <Input value={inviteFirst} onChange={(e) => setInviteFirst(e.target.value)} placeholder="Jane" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last Name</Label>
                      <Input value={inviteLast} onChange={(e) => setInviteLast(e.target.value)} placeholder="Smith" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="office_staff">Office Staff</SelectItem>
                        <SelectItem value="franchise_manager">Franchise Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSendInvite}
                    disabled={inviteLoading || !inviteEmail || !inviteFirst || !inviteLast}
                    style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {inviteLoading ? "Creating invite…" : "Create Invite Link"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </ModuleGate>
    </AdminLayout>
  );
}
