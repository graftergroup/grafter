# Module System — Frontend Completion (Tasks 5–9)

## Context
Backend is fully done (Models, schemas, routes_modules.py, billing update, router registration — tasks 1–4 complete). `ModuleManagement.tsx` superadmin page exists (task 5 in_progress). Four tasks remain before the module system is shippable.

## What's Already Done
- `backend/models.py` — `Module`, `FranchiseModule`, `module_fees` on `FranchiseBillingRecord`
- `backend/schemas.py` — all module schemas + updated `BillingRecordResponse`
- `backend/routes_modules.py` — all API endpoints
- `backend/routes_superadmin.py` — billing generation sums module fees
- `routes.py` — all three routers registered
- `src/pages/superadmin/ModuleManagement.tsx` — 482 lines, complete page

## Remaining Work

### Task 5 (complete): Wire SuperadminSidebar + App.tsx for ModuleManagement

**`src/components/superadmin/SuperadminSidebar.tsx`**
- Line 3: add `Puzzle` to lucide imports
- Line 11: add `{ href: "/superadmin/modules", label: "Modules", icon: Puzzle }` to `NAV_ITEMS` array after Billing

**`src/App.tsx`**
- Add import: `import { ModuleManagement } from "@/pages/superadmin/ModuleManagement"`
- Add route inside superadmin layout block (after billing, line ~132):
  `<Route path="/superadmin/modules" element={<ModuleManagement />} />`

**`src/hooks/useTabs.tsx`**
- Add `"/superadmin/modules": "Modules"` to `ROUTE_LABELS`

---

### Task 6: FranchiseDetail — Modules inner tab

**`src/pages/superadmin/FranchiseDetail.tsx`**

1. Add `Puzzle` to lucide imports (already has `Settings`, `DollarSign`, `Users`, `TrendingUp`)
2. Add `"modules"` to `InnerTab` union type
3. Add tab entry to `INNER_TABS` array: `{ id: "modules", label: "Modules", icon: <Puzzle className="w-3.5 h-3.5" /> }`
4. Add state + fetch: `const [fmList, setFmList] = useState<FMEntry[]>([])` + `useEffect` fetching `GET /api/superadmin/franchises/:id/modules` when `activeTab === "modules"`
5. Add `FMEntry` interface (inline): `{ id, module_id, module_name, module_description, status, custom_price, effective_price, monthly_price, requested_at }`
6. Render modules tab panel: card grid or table, one row/card per module with:
   - Module name + description
   - Status chip: `active` (green), `pending` (amber), `rejected` (red), `inactive` (muted)
   - Effective price display + optional custom price input (inline edit with save)
   - Toggle switch: for `inactive` → activate (PUT with `status: "active"`), for `active` → deactivate
   - For `pending`: Approve + Reject buttons with custom price field inline

API calls:
- List: `GET /api/superadmin/franchises/:id/modules`
- Toggle/set: `PUT /api/superadmin/franchises/:id/modules/:module_id` body `{ status, custom_price }`

---

### Task 7: Admin Sidebar + ModuleCatalogue page

**`src/components/admin/Sidebar.tsx`**
- Add `Puzzle` to lucide imports block (line 4–19)
- Add `{ label: "Modules", href: "/admin/modules", icon: Puzzle }` to `ADMIN_MENU` after Settings (line ~57)

**`src/pages/admin/ModuleCatalogue.tsx`** — new file
- Uses `AdminLayout`
- Header: "Modules" + subtitle "Features available for your franchise"
- Fetches `GET /api/modules` (franchise member endpoint — returns modules with `status` per franchise)
- Card grid (3 cols on lg): one card per module
  - Module name (bold), description (muted)
  - Monthly price badge (amber)
  - Status chip + action:
    - `active` → green "Active" badge, no button
    - `pending` → amber "Pending Approval" badge, disabled button
    - `rejected` → red "Rejected" badge, "Request Again" button
    - `inactive` → "Request Access" button → `POST /api/modules/:id/request`
  - On request success: optimistic status update to `pending`

**`src/App.tsx`**
- Add import: `import ModuleCatalogue from "@/pages/admin/ModuleCatalogue"`
- Add route inside admin layout block: `<Route path="/admin/modules" element={<ModuleCatalogue />} />`

**`src/hooks/useTabs.tsx`**
- Add `"/admin/modules": "Modules"` to `ROUTE_LABELS`

---

### Task 8: BillingManagement — module_fees column

**`src/pages/superadmin/BillingManagement.tsx`**
- Add `module_fees: number` to the billing record interface/type
- Add column to DataTable ColDef array: `{ key: "module_fees", header: "Module Fees", render: (r) => \`£${r.module_fees?.toFixed(2) ?? "0.00"}\` }`
- Optionally show `commission_amount + module_fees` as "Total Due" derived column

---

### Task 9: Type-check + start + verify + commit

```bash
cd /data/users/.../grafter_services
bunx tsc --noEmit
bash start.sh
```

Verify:
1. Superadmin sidebar shows "Modules" nav item → navigates to `/superadmin/modules`
2. Modules page loads, create a module
3. FranchiseDetail → Modules tab shows all modules, toggle activates one
4. Billing generation → `module_fees` appears in BillingManagement table
5. Admin → Modules page shows catalogue + Request Access works

```bash
git add -A && git commit -m "feat: module system frontend — sidebar, ModuleManagement, FranchiseDetail Modules tab, ModuleCatalogue, BillingManagement module_fees"
```

## Files Modified
| File | Change |
|------|--------|
| `src/components/superadmin/SuperadminSidebar.tsx` | Add Modules nav item |
| `src/components/admin/Sidebar.tsx` | Add Modules nav item |
| `src/hooks/useTabs.tsx` | Add 2 route labels |
| `src/App.tsx` | Add 2 routes + 2 imports |
| `src/pages/superadmin/FranchiseDetail.tsx` | Add Modules inner tab |
| `src/pages/superadmin/BillingManagement.tsx` | Add module_fees column |
| `src/pages/admin/ModuleCatalogue.tsx` | New file |
