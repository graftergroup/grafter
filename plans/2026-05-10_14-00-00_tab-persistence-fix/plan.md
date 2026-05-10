# Tab Persistence Fix — Router-Level TabProvider

## Context
The tab bar was built in the previous session. It works visually but **resets on every navigation** because `TabProvider` lives inside `AdminLayout` / `SuperadminLayout`, which remounts each time React Router renders a new page component. Every navigation instantiates a fresh `TabProvider` with an empty `tabs` array.

The fix: lift `TabProvider` to **React Router layout routes** in `App.tsx` so the context mounts once and survives all child route navigations via `<Outlet />`.

## Root Cause
```
Route /admin → AdminDashboard → renders AdminLayout → renders TabProvider (fresh)
Route /admin/staff → StaffManagement → renders AdminLayout → renders TabProvider (fresh again)
```
Each page renders its own layout wrapper, so each render creates a new `TabProvider`.

## Scope
- Fix tab persistence across all admin + superadmin routes
- No UX changes to TabBar visual design
- No changes to `useTabs.tsx` or `TabBar.tsx`

## Non-Goals
- No new pages or features
- No design changes

## Implementation Plan

### 1. `src/App.tsx` — Add layout route wrappers

Add two layout components just above `AppRoutes`:

```tsx
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
```

Restructure admin routes to nest under `<Route element={<RoleProtectedRoute ...><AdminTabLayout /></RoleProtectedRoute>}>`:

```tsx
<Route element={
  <RoleProtectedRoute allowedRoles={["admin", "franchise_manager"]}>
    <AdminTabLayout />
  </RoleProtectedRoute>
}>
  <Route path="/admin" element={<AdminDashboard />} />
  <Route path="/admin/revenue" element={<RevenueManagement />} />
  <Route path="/admin/team" element={<TeamManagement />} />
  <Route path="/admin/performance" element={<StaffPerformance />} />
  <Route path="/admin/customers" element={<CustomersBookings />} />
  <Route path="/admin/bookings" element={<CustomersBookings />} />
  <Route path="/admin/vehicles" element={<VehicleFleet />} />
  <Route path="/admin/staff" element={<StaffManagement />} />
  <Route path="/admin/locations" element={<LocationManagement />} />
</Route>
```

Same pattern for superadmin routes nested under `SuperadminTabLayout`.

### 2. `src/components/admin/AdminLayout.tsx` — Remove TabProvider wrapper

Change the exported `AdminLayout` from wrapping with `TabProvider` to just rendering `AdminLayoutInner` directly:

```tsx
// Before
export function AdminLayout(props: AdminLayoutProps) {
  return (
    <TabProvider homeRoute="/admin">
      <AdminLayoutInner {...props} />
    </TabProvider>
  );
}

// After
export function AdminLayout(props: AdminLayoutProps) {
  return <AdminLayoutInner {...props} />;
}
```

Remove the `TabProvider` import line from this file.

### 3. `src/components/superadmin/SuperadminLayout.tsx` — Same change

```tsx
// Before
export function SuperadminLayout({ children }: { children: ReactNode }) {
  return (
    <TabProvider homeRoute="/superadmin">
      <SuperadminLayoutInner>{children}</SuperadminLayoutInner>
    </TabProvider>
  );
}

// After
export function SuperadminLayout({ children }: { children: ReactNode }) {
  return <SuperadminLayoutInner>{children}</SuperadminLayoutInner>;
}
```

Remove `TabProvider` import.

### 4. Verify with `bunx tsc --noEmit`

Run TypeScript check to confirm no type errors introduced.

## Verification
1. Start dev server
2. Navigate to `/admin` → tab "Dashboard" appears
3. Click "Staff" in sidebar → tab "Staff" appears alongside "Dashboard" (does NOT reset)
4. Click × on a tab → navigates to adjacent tab
5. Click "Close all" → navigates to homeRoute, all tabs cleared
6. Same test for superadmin area
