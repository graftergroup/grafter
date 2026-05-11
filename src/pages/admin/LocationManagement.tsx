import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, MapPin, Star, Trash2, Pencil } from "lucide-react";

interface Location {
  id: string;
  franchise_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LocationFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_primary: boolean;
}

const EMPTY_FORM: LocationFormData = {
  name: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  phone: "",
  is_primary: false,
};

export function LocationManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const token = () => localStorage.getItem("access_token");

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/locations", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setLocations(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      address: loc.address ?? "",
      city: loc.city ?? "",
      state: loc.state ?? "",
      postal_code: loc.postal_code ?? "",
      country: loc.country ?? "",
      phone: loc.phone ?? "",
      is_primary: loc.is_primary,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingId ? `/api/locations/${editingId}` : "/api/locations";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchLocations();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to save location");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this location?")) return;
    await fetch(`/api/locations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchLocations();
  };

  const set = (field: keyof LocationFormData, val: string | boolean) =>
    setForm((f) => ({ ...f, [field]: val }));

  return (
    <AdminLayout title="Locations" description="Manage your franchise branches and locations">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Location</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">Loading...</div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No locations yet. Add your first branch to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <Card key={loc.id} className="relative">
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="font-semibold text-sm">{loc.name}</p>
                    </div>
                    {loc.is_primary && (
                      <Badge variant="default" className="text-xs flex items-center gap-1">
                        <Star className="w-3 h-3" />Primary
                      </Badge>
                    )}
                  </div>

                  {(loc.address || loc.city) && (
                    <p className="text-xs text-muted-foreground pl-6">
                      {[loc.address, loc.city, loc.state, loc.postal_code].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {loc.phone && (
                    <p className="text-xs text-muted-foreground pl-6">{loc.phone}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(loc)}>
                      <Pencil className="w-3 h-3 mr-1" />Edit
                    </Button>
                    {!loc.is_primary && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(loc.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6)" }}>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Location Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Main Office" />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 High Street" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>State / County</Label>
                <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Postcode</Label>
                <Input value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="UK" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(e) => set("is_primary", e.target.checked)}
                className="rounded"
              />
              Set as primary location
            </label>
            <Button className="w-full" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving..." : editingId ? "Update Location" : "Add Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
