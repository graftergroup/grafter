import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TabProvider } from "@/hooks/useTabs";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";
import { PendingApprovalPage } from "@/pages/PendingApprovalPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { RevenueManagement } from "@/pages/admin/RevenueManagement";
import { TeamManagement } from "@/pages/admin/TeamManagement";
import { CustomersBookings } from "@/pages/admin/CustomersBookings";
import { VehicleFleet } from "@/pages/admin/VehicleFleet";
import { StaffManagement } from "@/pages/admin/StaffManagement";
import { StaffPerformance } from "@/pages/admin/StaffPerformance";
import { LocationManagement } from "@/pages/admin/LocationManagement";
import { SuperadminDashboard } from "@/pages/superadmin/SuperadminDashboard";
import { FranchiseManagement } from "@/pages/superadmin/FranchiseManagement";
import { AllStaff } from "@/pages/superadmin/AllStaff";
import { BillingManagement } from "@/pages/superadmin/BillingManagement";
import { FranchiseDetail } from "@/pages/superadmin/FranchiseDetail";
import type { UserRole } from "@/types";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function RoleProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

/* ─── Tab layout wrappers (mount once, persist across child navigations) ── */
function AdminTabLayout() {
  return (
    <TabProvider homeRoute="/admin">
      <Outlet />
    </TabProvider>
  );
}

function SuperadminTabLayout() {
  return (
    <TabProvider homeRoute="/superadmin">
      <Outlet />
    </TabProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Admin/Franchisee Routes — TabProvider mounts once here */}
      <Route
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <AdminTabLayout />
          </RoleProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/invoices" element={<RevenueManagement />} />
        <Route path="/admin/revenue-reports" element={<RevenueManagement />} />
        <Route path="/admin/payments" element={<RevenueManagement />} />
        <Route path="/admin/technicians" element={<TeamManagement />} />
        <Route path="/admin/workload" element={<TeamManagement />} />
        <Route path="/admin/performance" element={<StaffPerformance />} />
        <Route path="/admin/customers" element={<CustomersBookings />} />
        <Route path="/admin/bookings" element={<CustomersBookings />} />
        <Route path="/admin/vehicles" element={<VehicleFleet />} />
        <Route path="/admin/staff" element={<StaffManagement />} />
        <Route path="/admin/locations" element={<LocationManagement />} />
      </Route>

      {/* Superadmin Routes — TabProvider mounts once here */}
      <Route
        element={
          <RoleProtectedRoute allowedRoles={["super_admin"]}>
            <SuperadminTabLayout />
          </RoleProtectedRoute>
        }
      >
        <Route path="/superadmin" element={<SuperadminDashboard />} />
        <Route path="/superadmin/franchises" element={<FranchiseManagement />} />
        <Route path="/superadmin/franchises/:id" element={<FranchiseDetail />} />
        <Route path="/superadmin/staff" element={<AllStaff />} />
        <Route path="/superadmin/billing" element={<BillingManagement />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
