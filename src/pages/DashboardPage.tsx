import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import type { Booking, Job, Customer } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar, Briefcase } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { call } = useApi();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [bookingsData, jobsData, customersData] = await Promise.all([
          call("/bookings"),
          call("/jobs"),
          call("/customers"),
        ]);

        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setJobs(Array.isArray(jobsData) ? jobsData : []);
        setCustomers(Array.isArray(customersData) ? customersData : []);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [call]);

  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const activeJobs = jobs.filter((j) => j.status === "in_progress").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Grafter Services</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.first_name}</p>
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Customers"
            value={customers.length}
            icon={Users}
            description="Active customers"
          />
          <StatsCard
            title="Pending Bookings"
            value={pendingBookings}
            icon={Calendar}
            description="Awaiting confirmation"
          />
          <StatsCard
            title="Active Jobs"
            value={activeJobs}
            icon={Briefcase}
            description="In progress"
          />
          <StatsCard
            title="Completed"
            value={completedBookings}
            icon={Calendar}
            description="This month"
          />
        </div>

        {/* Recent Bookings */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest service bookings</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">Booking #{String(booking.id).slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.scheduled_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Jobs</CardTitle>
              <CardDescription>Jobs in progress</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </CardHeader>
          <CardContent>
            {jobs.filter((j) => j.status === "in_progress").length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active jobs</p>
            ) : (
              <div className="space-y-4">
                {jobs
                  .filter((j) => j.status === "in_progress")
                  .slice(0, 5)
                  .map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">Job #{String(job.id).slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(job.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        in_progress
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
