import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useApi } from "@/hooks/useApi";
import type { Customer, Booking } from "@/types";
import { DataTable, StatusChip, Avatar } from "@/components/DataTable";
import type { ColDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Mail, Phone, Users, Calendar, CheckCircle } from "lucide-react";

export function CustomersBookings() {
  const { call } = useApi();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [customersData, bookingsData] = await Promise.all([
          call("/customers"),
          call("/bookings"),
        ]);

        setCustomers(Array.isArray(customersData) ? customersData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      } catch (err) {
        console.error("Failed to load customer data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [call]);

  if (isLoading) {
    return (
      <AdminLayout
        title="Customers & Bookings"
        description="Manage customers and view their bookings"
      >
        <div className="flex items-center justify-center h-96">Loading customer data...</div>
      </AdminLayout>
    );
  }

  const activeBookings = bookings.filter((b) => b.status === "confirmed").length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;

  const customerCols: ColDef<Customer>[] = [
    {
      key: "first_name",
      label: "Customer",
      sortable: true,
      render: (c) => <Avatar name={`${c.first_name} ${c.last_name}`} sub={c.email} />,
    },
    {
      key: "phone",
      label: "Phone",
      render: (c) => (
        <span className="text-sm tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
          {c.phone || "—"}
        </span>
      ),
    },
    {
      key: "city",
      label: "City",
      sortable: true,
      render: (c) => <span className="text-sm text-foreground">{c.city || "—"}</span>,
    },
    {
      key: "created_at",
      label: "Joined",
      sortable: true,
      render: (c) => (
        <span className="text-xs tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
          {new Date(c.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (c) => <StatusChip value={c.is_active ? "active" : "inactive"} />,
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

  const bookingCols: ColDef<Booking>[] = [
    {
      key: "id",
      label: "Booking ID",
      render: (b) => (
        <span className="text-xs tabular-nums font-medium" style={{ fontFamily: "'DM Mono', monospace", color: "hsl(var(--muted-foreground))" }}>
          #{String(b.id).slice(0, 8)}
        </span>
      ),
    },
    {
      key: "scheduled_date",
      label: "Scheduled",
      sortable: true,
      render: (b) => (
        <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          {new Date(b.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (b) => <StatusChip value={b.status} />,
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (b) => (
        <span className="text-xs tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
          {new Date(b.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "customer_id",
      label: "",
      align: "right",
      render: () => (
        <div className="flex justify-end gap-1">
          <button className="w-7 h-7 rounded-md flex items-center justify-center nav-transition
                             text-[hsl(var(--muted-foreground))] hover:text-foreground hover:bg-[hsl(var(--accent))]">
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Customers & Bookings" description="Manage customers and view their bookings">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Customers",    value: customers.length, icon: Users,       accent: "hsl(var(--blue))"  },
          { label: "Confirmed Bookings", value: activeBookings,   icon: CheckCircle, accent: "hsl(var(--green))" },
          { label: "Pending Bookings",   value: pendingBookings,  icon: Calendar,    accent: "hsl(var(--amber))" },
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

      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Customers</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Customer</Button>
          </div>
          <DataTable
            columns={customerCols}
            data={customers}
            rowKey="id"
            searchPlaceholder="Search customers…"
            searchKeys={["first_name", "last_name", "email", "city"]}
            loading={isLoading}
            emptyText="No customers yet"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Bookings</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Booking</Button>
          </div>
          <DataTable
            columns={bookingCols}
            data={bookings}
            rowKey="id"
            loading={isLoading}
            emptyText="No bookings yet"
          />
        </div>
      </div>
    </AdminLayout>
  );
}
