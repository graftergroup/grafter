import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TabProvider } from "@/hooks/useTabs";
import { ActiveModulesProvider } from "@/hooks/useActiveModules";
import { PermissionsProvider } from "@/hooks/usePermissions";
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
import { AdminStaffDetail, SuperadminStaffDetail } from "@/pages/shared/StaffDetail";
import { InvoiceDetail } from "@/pages/admin/InvoiceDetail";
import { ModuleManagement } from "@/pages/superadmin/ModuleManagement";
import { SuperadminSettings } from "@/pages/superadmin/SuperadminSettings";
import ModuleCatalogue from "@/pages/admin/ModuleCatalogue";
import HREmployees from "@/pages/admin/hr/HREmployees";
import HREmployeeDetail from "@/pages/admin/hr/HREmployeeDetail";
import HRCalendar from "@/pages/admin/hr/HRCalendar";
import HRRotas from "@/pages/admin/hr/HRRotas";
import HRDocuments from "@/pages/admin/hr/HRDocuments";
import HRPerformance from "@/pages/admin/hr/HRPerformance";
import HRExpenses from "@/pages/admin/hr/HRExpenses";
import HRPayroll from "@/pages/admin/hr/HRPayroll";
import HRRecruitment from "@/pages/admin/hr/HRRecruitment";
import type { UserRole } from "@/types";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

/** Sends users to the right home based on their role */
function RoleHome() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" />;
  if (user.role === "super_admin") return <Navigate to="/superadmin" replace />;
  if (user.role === "admin" || user.role === "franchise_manager") return <Navigate to="/admin" replace />;
  return <Navigate to="/pending-approval" replace />;
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
    return <Navigate to="/login" />;
  }

  return children;
}

/* ─── Tab layout wrappers (mount once, persist across child navigations) ── */
function AdminTabLayout() {
  return (
    <ActiveModulesProvider>
      <TabProvider homeRoute="/admin">
        <Outlet />
      </TabProvider>
    </ActiveModulesProvider>
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
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
      {/* Smart redirect — sends each role to its correct home */}
      <Route path="/dashboard" element={<RoleHome />} />
      <Route path="/" element={<RoleHome />} />

      {/* Admin/Franchisee Routes — TabProvider mounts once here */}
      <Route
        element={
          <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
            <PermissionsProvider>
              <AdminTabLayout />
            </PermissionsProvider>
          </RoleProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/invoices" element={<RevenueManagement />} />
        <Route path="/admin/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/admin/revenue-reports" element={<RevenueManagement />} />
        <Route path="/admin/payments" element={<RevenueManagement />} />
        <Route path="/admin/technicians" element={<TeamManagement />} />
        <Route path="/admin/workload" element={<TeamManagement />} />
        <Route path="/admin/performance" element={<StaffPerformance />} />
        <Route path="/admin/customers" element={<CustomersBookings />} />
        <Route path="/admin/bookings" element={<CustomersBookings />} />
        <Route path="/admin/vehicles" element={<VehicleFleet />} />
        <Route path="/admin/staff" element={<StaffManagement />} />
        <Route path="/admin/staff/:id" element={<AdminStaffDetail />} />
        <Route path="/admin/locations" element={<LocationManagement />} />
        <Route path="/admin/modules" element={<ModuleCatalogue />} />
        {/* HR Module */}
        <Route path="/admin/hr/employees" element={<HREmployees />} />
        <Route path="/admin/hr/employees/:id" element={<HREmployeeDetail />} />
        <Route path="/admin/hr/calendar" element={<HRCalendar />} />
        <Route path="/admin/hr/rotas" element={<HRRotas />} />
        <Route path="/admin/hr/documents" element={<HRDocuments />} />
        <Route path="/admin/hr/performance" element={<HRPerformance />} />
        <Route path="/admin/hr/expenses" element={<HRExpenses />} />
        <Route path="/admin/hr/payroll" element={<HRPayroll />} />
        <Route path="/admin/hr/recruitment" element={<HRRecruitment />} />
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
        <Route path="/superadmin/staff/:id" element={<SuperadminStaffDetail />} />
        <Route path="/superadmin/billing" element={<BillingManagement />} />
        <Route path="/superadmin/modules" element={<ModuleManagement />} />
        <Route path="/superadmin/settings" element={<SuperadminSettings />} />
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
