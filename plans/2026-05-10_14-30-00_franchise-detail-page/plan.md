# Franchise Detail Page with Inner Tab System

## Context
Clicking a franchise row in FranchiseManagement should:
1. Open `/superadmin/franchises/:id` as a new tab in the outer tab bar
2. Render a full franchise detail page with its own inner tab system for managing all aspects of that franchise

## Implementation Plan

### 1. `src/hooks/useTabs.tsx` — Support dynamic route labels
`ROUTE_LABELS` currently only matches exact static paths. Franchise detail routes like `/superadmin/franchises/abc-123` won't match.

**Fix**: Support a prefix-matching fallback for dynamic routes. Add a `registerDynamicTab` method to the context so the detail page can register its own label when it loads the franchise name.

New context shape:
```ts
interface TabContextValue {
  tabs: Tab[];
  closeTab: (path: string) => void;
  closeAll: () => void;
  registerTab: (path: string, label: string) => void; // for dynamic routes
}
```

The `useEffect` in `TabProvider` should still auto-add tabs from `ROUTE_LABELS`, but for dynamic paths the page calls `registerTab(path, franchiseName)` once the API data loads.

### 2. `src/pages/superadmin/FranchiseDetail.tsx` — New page
Full franchise management page. Receives `id` from `useParams()`.

**Outer layout**: `SuperadminLayout` wrapper (same as other superadmin pages)

**Data fetched**:
- `GET /api/superadmin/franchises/:id` → franchise details
- `GET /api/superadmin/franchises/:id/stats` → staff_count, bookings, revenue, completed_jobs
- `GET /api/staff?franchise_id=:id` → staff list for this franchise (needs backend route check)
- `GET /api/superadmin/billing?franchise_id=:id` → billing records

**Inner tab bar**: Custom styled tab strip (not the outer TabBar — this is a page-internal UI pattern using simple state):
```
[Overview] [Staff] [Billing] [Settings]
```

**Overview tab**:
- Hero header: franchise name, city/state, approval status chip, active chip
- 4 metric cards: Staff Count, Total Bookings, Total Revenue, Completed Jobs
- Commission rate display
- Notes

**Staff tab**:
- DataTable of staff for this franchise (name, email, role, status)
- Inline invite button (reuse invite flow logic)

**Billing tab**:
- DataTable of billing records (period, gross revenue, commission rate, commission amount, status)
- Generate billing button

**Settings tab**:
- Edit franchise form (name, email, phone, address, city, state, postal_code, country)
- Commission rate field
- Approve/Reject buttons if pending
- Delete franchise (destructive, confirmation required)

### 3. `src/pages/superadmin/FranchiseManagement.tsx` — Row click navigates
In the `columns` name cell, wrap the `Avatar` with a `useNavigate` call:
```tsx
render: (f) => (
  <button onClick={() => navigate(`/superadmin/franchises/${f.id}`)}>
    <Avatar name={f.name} sub={f.email} />
  </button>
)
```

Also remove the Edit button from the actions column (settings are now in the detail page).

### 4. `src/App.tsx` — Add route + ROUTE_LABELS
Add nested route inside the superadmin layout group:
```tsx
<Route path="/superadmin/franchises/:id" element={<FranchiseDetail />} />
```

### 5. `src/hooks/useTabs.tsx` — Add franchise route prefix support
Update the `useEffect` to also check if path starts with `/superadmin/franchises/` and handle via `registerTab`.

## Backend check needed
- `GET /api/staff?franchise_id=:id` — check if filtering by franchise_id is supported on the staff list route
- If not, add a query param filter in `routes_staff.py`

## Verification
1. Navigate to `/superadmin/franchises` → click a franchise row → outer tab bar shows "Franchise: [Name]"
2. Inner tabs: Overview shows stats, Staff shows DataTable, Billing shows records, Settings has edit form
3. Closing the outer tab returns to Franchises list
