import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { RevenueManagement } from "@/pages/admin/RevenueManagement";
import { TeamManagement } from "@/pages/admin/TeamManagement";
import { CustomersBookings } from "@/pages/admin/CustomersBookings";
import { VehicleFleet } from "@/pages/admin/VehicleFleet";
import { StaffManagement } from "@/pages/admin/StaffManagement";
import { StaffPerformance } from "@/pages/admin/StaffPerformance";
import { SuperadminDashboard } from "@/pages/superadmin/SuperadminDashboard";
import { FranchiseManagement } from "@/pages/superadmin/FranchiseManagement";
import { AllStaff } from "@/pages/superadmin/AllStaff";
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

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      {/* Admin/Franchisee Routes */}
      <Route
        path="/admin"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <AdminDashboard />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/invoices"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <RevenueManagement />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/revenue-reports"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <RevenueManagement />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <RevenueManagement />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/technicians"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <TeamManagement />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/workload"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <TeamManagement />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/performance"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <StaffPerformance />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <CustomersBookings />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <CustomersBookings />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/vehicles"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <VehicleFleet />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <StaffManagement />
          </RoleProtectedRoute>
        }
      />
      {/* Superadmin Routes */}
      <Route
        path="/superadmin"
        element={
          <RoleProtectedRoute allowedRoles={["super_admin"]}>
            <SuperadminDashboard />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/superadmin/franchises"
        element={
          <RoleProtectedRoute allowedRoles={["super_admin"]}>
            <FranchiseManagement />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/superadmin/staff"
        element={
          <RoleProtectedRoute allowedRoles={["super_admin"]}>
            <AllStaff />
          </RoleProtectedRoute>
        }
      />
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
