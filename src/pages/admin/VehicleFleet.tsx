import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useApi } from "@/hooks/useApi";
import type { Vehicle } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, MapPin, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    <AdminLayout title="Vehicle Fleet" description="Manage your service vehicles">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
            <p className="text-xs text-muted-foreground">In your fleet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeVehicles}</div>
            <p className="text-xs text-muted-foreground">Ready for service</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">GPS Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withTracking}</div>
            <p className="text-xs text-muted-foreground">Vehicles tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {vehicles.length - activeVehicles}
            </div>
            <p className="text-xs text-muted-foreground">Maintenance needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fleet Vehicles</CardTitle>
            <CardDescription>All service vehicles</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No vehicles yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plate Number</TableHead>
                    <TableHead>Make</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>VIN</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-bold text-lg">{vehicle.plate_number}</TableCell>
                      <TableCell>{vehicle.make}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.year}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {vehicle.vin ? vehicle.vin.slice(-6) : "—"}
                      </TableCell>
                      <TableCell>
                        {vehicle.current_latitude && vehicle.current_longitude ? (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span>
                              {vehicle.current_latitude.toFixed(4)},
                              {vehicle.current_longitude.toFixed(4)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            No location
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.last_location_update
                          ? new Date(vehicle.last_location_update).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={vehicle.is_active ? "default" : "secondary"}
                        >
                          {vehicle.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
