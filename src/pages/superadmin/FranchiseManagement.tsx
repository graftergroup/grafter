import { useState, useEffect } from "react";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { FranchiseCard } from "@/components/FranchiseCard";
import type { FranchiseCardData } from "@/components/FranchiseCard";
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
import { Plus, Search, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [editingFranchise, setEditingFranchise] = useState<FranchiseCardData | null>(
    null
  );

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
        form.reset();
        setEditingFranchise(null);
        setIsDialogOpen(false);
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
      form.reset();
    }
  };

  if (loading) {
    return (
      <SuperadminLayout>
        <div className="flex items-center justify-center h-96">Loading...</div>
      </SuperadminLayout>
    );
  }

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Franchises</h1>
            <p className="text-muted-foreground mt-1">Manage all franchises</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              New Franchise
            </Button>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingFranchise ? "Edit Franchise" : "Create New Franchise"}
                </DialogTitle>
                <DialogDescription>
                  {editingFranchise
                    ? "Update franchise information"
                    : "Add a new franchise to the platform"}
                </DialogDescription>
              </DialogHeader>

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

                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingFranchise ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search franchises..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Pending Approval Section */}
        {filteredFranchises.filter(f => (f as FranchiseCardData & { approval_status?: string }).approval_status === "pending").length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Badge variant="secondary">Pending Approval</Badge>
              <span className="text-muted-foreground font-normal text-sm">
                {filteredFranchises.filter(f => (f as FranchiseCardData & { approval_status?: string }).approval_status === "pending").length} awaiting review
              </span>
            </h2>
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {filteredFranchises
                .filter(f => (f as FranchiseCardData & { approval_status?: string }).approval_status === "pending")
                .map(franchise => (
                  <div key={franchise.id} className="flex items-center justify-between px-4 py-3 bg-card">
                    <div>
                      <p className="font-medium text-sm">{franchise.name}</p>
                      <p className="text-xs text-muted-foreground">{franchise.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(franchise.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(franchise.id)}>
                        <XCircle className="w-4 h-4 mr-1" />Reject
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFranchises.map((franchise) => (
            <FranchiseCard
              key={franchise.id}
              franchise={franchise}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {filteredFranchises.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No franchises found
          </div>
        )}
      </div>
    </SuperadminLayout>
  );
}
