import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useApi } from "@/hooks/useApi";
import type { Vehicle } from "@/types";
import { DataTable, StatusChip } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, MapPin, AlertCircle, Truck, Zap } from "lucide-react";

export function VehicleFleet() {
  const { call } = useApi();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const vehiclesData = await call("/vehicles");
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      } catch (err) {
        console.error("Failed to load vehicle data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [call]);

  if (isLoading) {
    return (
      <AdminLayout title="Vehicle Fleet" description="Manage your service vehicles">
        <div className="flex items-center justify-center h-96">Loading vehicle data...</div>
      </AdminLayout>
    );
  }

  const activeVehicles = vehicles.filter((v) => v.is_active).length;
  const withTracking = vehicles.filter(
    (v) => v.current_latitude && v.current_longitude
  ).length;

  return (
  const columns: ColDef<Vehicle>[] = [
    {
      key: "plate_number",
      label: "Plate",
      sortable: true,
      render: (v) => (
        <span className="text-sm font-bold tabular-nums tracking-wider text-foreground"
              style={{ fontFamily: "'DM Mono', monospace" }}>
          {v.plate_number}
        </span>
      ),
    },
    {
      key: "make",
      label: "Make / Model",
      sortable: true,
      render: (v) => (
        <div>
          <p className="text-sm font-medium text-foreground">{v.make} {v.model}</p>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{v.year}</p>
        </div>
      ),
    },
    {
      key: "vin",
      label: "VIN",
      render: (v) => (
        <span className="text-xs tabular-nums" style={{ fontFamily: "'DM Mono', monospace", color: "hsl(var(--muted-foreground))" }}>
          {v.vin ? `···${v.vin.slice(-6)}` : "—"}
        </span>
      ),
    },
    {
      key: "current_latitude",
      label: "GPS",
      render: (v) =>
        v.current_latitude && v.current_longitude ? (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--green))" }}>
            <MapPin className="w-3 h-3" />
            <span className="tabular-nums">{v.current_latitude.toFixed(3)}, {v.current_longitude.toFixed(3)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            <AlertCircle className="w-3 h-3" />
            No signal
          </div>
        ),
    },
    {
      key: "last_location_update",
      label: "Last Update",
      sortable: true,
      render: (v) => (
        <span className="text-xs tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
          {v.last_location_update ? new Date(v.last_location_update).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (v) => <StatusChip value={v.is_active ? "active" : "inactive"} />,
    },
    {
      key: "id",
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
    <AdminLayout title="Vehicle Fleet" description="Manage your service vehicles">
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Vehicles",  value: vehicles.length,                 icon: Truck,        accent: "hsl(var(--blue))"  },
            { label: "Active",          value: activeVehicles,                   icon: Zap,          accent: "hsl(var(--green))" },
            { label: "GPS Tracked",     value: withTracking,                     icon: MapPin,       accent: "hsl(var(--amber))" },
            { label: "Inactive",        value: vehicles.length - activeVehicles, icon: AlertCircle,  accent: "hsl(var(--red))"   },
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
          <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Vehicle</Button>
        </div>

        <DataTable
          columns={columns}
          data={vehicles}
          rowKey="id"
          loading={isLoading}
          emptyText="No vehicles in your fleet yet"
        />
      </div>
    </AdminLayout>
  );
}
