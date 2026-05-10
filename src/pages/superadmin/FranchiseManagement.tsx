import { useState, useEffect } from "react";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import type { FranchiseCardData } from "@/components/FranchiseCard";
import { DataTable, StatusChip, Avatar } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, CheckCircle, XCircle, Copy, Check, Edit, Trash2, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";

const franchiseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

export type FranchiseFormData = z.infer<typeof franchiseFormSchema>;

export function FranchiseManagement() {
  const [franchises, setFranchises] = useState<FranchiseCardData[]>([]);
  const [filteredFranchises, setFilteredFranchises] = useState<FranchiseCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<FranchiseCardData | null>(null);

  // Invite-manager state (shown after franchise creation)
  const [inviteStep, setInviteStep] = useState(false);
  const [newFranchiseId, setNewFranchiseId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const form = useForm<FranchiseFormData>({
    resolver: zodResolver(franchiseFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      notes: "",
    },
  });

  const fetchFranchises = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/superadmin/franchises", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFranchises(data);
        setFilteredFranchises(data);
      }
    } catch (error) {
      console.error("Error fetching franchises:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFranchises();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFranchises(franchises);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredFranchises(
        franchises.filter(
          (f) =>
            f.name.toLowerCase().includes(term) ||
            f.email.toLowerCase().includes(term) ||
            f.city?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, franchises]);

  const onSubmit = async (values: FranchiseFormData) => {
    try {
      const token = localStorage.getItem("access_token");
      const url = editingFranchise
        ? `/api/superadmin/franchises/${editingFranchise.id}`
        : "/api/superadmin/franchises";

      const method = editingFranchise ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        form.reset();
        if (!editingFranchise) {
          // After creating, offer to invite a franchise manager
          setNewFranchiseId(data.id);
          setInviteStep(true);
        } else {
          setEditingFranchise(null);
          setIsDialogOpen(false);
        }
        fetchFranchises();
      }
    } catch (error) {
      console.error("Error saving franchise:", error);
    }
  };

  const handleEdit = (franchise: FranchiseCardData) => {
    setEditingFranchise(franchise);
    form.reset({
      name: franchise.name,
      email: franchise.email,
      phone: "",
      city: franchise.city || "",
      state: franchise.state || "",
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`/api/superadmin/franchises/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFranchises();
    } catch (error) {
      console.error("Error updating franchise:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this franchise?")) return;
    await handleToggleActive(id, false);
  };

  const handleApprove = async (id: string) => {
    const token = localStorage.getItem("access_token");
    await fetch(`/api/superadmin/franchises/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchFranchises();
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject this franchise application?")) return;
    const token = localStorage.getItem("access_token");
    await fetch(`/api/superadmin/franchises/${id}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchFranchises();
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingFranchise(null);
      setInviteStep(false);
      setNewFranchiseId(null);
      setInviteEmail("");
      setInviteFirst("");
      setInviteLast("");
      setInviteLink(null);
      setInviteCopied(false);
      form.reset();
    }
  };

  const handleSendInvite = async () => {
    setInviteLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          first_name: inviteFirst,
          last_name: inviteLast,
          role: "franchise_manager",
          franchise_id: newFranchiseId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.invite_url);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to generate invite");
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  // ── Column definitions ───────────────────────────────────────
  type FranchiseRow = FranchiseCardData & { approval_status?: string };

  const columns: ColDef<FranchiseRow>[] = [
    {
      key: "name",
      label: "Franchise",
      sortable: true,
      render: (f) => <Avatar name={f.name} sub={f.email} />,
    },
    {
      key: "city",
      label: "Location",
      sortable: true,
      render: (f) => (
        <div className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          {(f.city || f.state) && <MapPin className="w-3 h-3 flex-shrink-0" />}
          <span>{[f.city, f.state].filter(Boolean).join(", ") || "—"}</span>
        </div>
      ),
    },
    {
      key: "approval_status",
      label: "Status",
      sortable: true,
      render: (f) => {
        const status = f.approval_status ?? (f.is_active ? "approved" : "inactive");
        return <StatusChip value={status} />;
      },
    },
    {
      key: "is_active",
      label: "Active",
      sortable: true,
      render: (f) => <StatusChip value={f.is_active ? "active" : "inactive"} />,
    },
    {
      key: "id",
      label: "",
      align: "right",
      render: (f) => {
        const status = (f as FranchiseRow).approval_status;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {status === "pending" && (
              <>
                <button
                  onClick={() => handleApprove(f.id)}
                  title="Approve"
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md nav-transition font-medium"
                  style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))", border: "1px solid hsl(var(--green) / 0.3)" }}
                >
                  <CheckCircle className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => handleReject(f.id)}
                  title="Reject"
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md nav-transition font-medium"
                  style={{ background: "hsl(var(--red) / 0.1)", color: "hsl(var(--red))", border: "1px solid hsl(var(--red) / 0.25)" }}
                >
                  <XCircle className="w-3 h-3" /> Reject
                </button>
              </>
            )}
            {status !== "pending" && (
              <>
                <button
                  onClick={() => handleEdit(f)}
                  className="w-7 h-7 rounded-md flex items-center justify-center nav-transition
                             text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--accent))]"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="w-7 h-7 rounded-md flex items-center justify-center nav-transition
                             text-[hsl(var(--muted-foreground))] hover:text-destructive hover:bg-[hsl(var(--destructive)/0.1)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <SuperadminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="skeleton h-7 w-36 rounded" />
              <div className="skeleton h-4 w-48 rounded" />
            </div>
            <div className="skeleton h-9 w-32 rounded-lg" />
          </div>
          <div className="skeleton h-[400px] rounded-xl" />
        </div>
      </SuperadminLayout>
    );
  }

  const pendingCount = franchises.filter(
    (f) => (f as FranchiseRow).approval_status === "pending"
  ).length;

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Franchises</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              {franchises.length} total
              {pendingCount > 0 && (
                <span className="ml-2 pill-badge">{pendingCount} pending</span>
              )}
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              New Franchise
            </Button>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {inviteStep
                    ? "Invite Franchise Manager"
                    : editingFranchise
                    ? "Edit Franchise"
                    : "Create New Franchise"}
                </DialogTitle>
                <DialogDescription>
                  {inviteStep
                    ? "Franchise created! Optionally invite a manager to log in."
                    : editingFranchise
                    ? "Update franchise information"
                    : "Add a new franchise to the platform"}
                </DialogDescription>
              </DialogHeader>

              {inviteStep ? (
                /* ── Invite manager step ── */
                <div className="space-y-4 pt-2">
                  {!inviteLink ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>First Name</Label>
                          <Input value={inviteFirst} onChange={(e) => setInviteFirst(e.target.value)} placeholder="Jane" />
                        </div>
                        <div className="space-y-1">
                          <Label>Last Name</Label>
                          <Input value={inviteLast} onChange={(e) => setInviteLast(e.target.value)} placeholder="Smith" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Email</Label>
                        <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="manager@franchise.com" />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={handleSendInvite}
                          disabled={inviteLoading || !inviteEmail || !inviteFirst || !inviteLast}
                        >
                          {inviteLoading ? "Generating..." : "Generate Invite Link"}
                        </Button>
                        <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                          Skip
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Share this link with <strong>{inviteEmail}</strong>. It expires in 72 hours.
                      </p>
                      <div className="flex gap-2">
                        <Input readOnly value={inviteLink} className="text-xs" />
                        <Button variant="outline" size="icon" onClick={handleCopyInvite}>
                          {inviteCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button className="w-full" onClick={() => handleDialogOpenChange(false)}>
                        Done
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                /* ── Franchise form ── */
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    {editingFranchise ? "Update Franchise" : "Create Franchise"}
                  </Button>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <DataTable
          columns={columns}
          data={franchises as FranchiseRow[]}
          rowKey="id"
          searchPlaceholder="Search by name, email or city…"
          searchKeys={["name", "email", "city"]}
          loading={loading}
          emptyText="No franchises yet. Create one to get started."
        />
      </div>
    </SuperadminLayout>
  );
}
