# Role & Access Permission System — Franchisee Model (with CRUD Actions)

## Context

Currently all access control is purely role-based (hard-coded `UserRole` enum checks). The request:
- Manage which **areas** each staff member can access
- Per-area: independently control **View / Create / Update / Delete** actions
- All default to **granted** (true) when no override exists
- Apply consistently across all current and future admin sidebar areas

---

## Scope & Non-Goals

**In scope:**
- New DB table: `user_permissions` — one row per (user, slug) with boolean columns for each CRUD action
- Permission slugs map 1:1 to sidebar sections
- Admin UI: permissions editor in `HREmployeeDetail` Profile tab + `StaffManagement`
- Frontend `usePermissions` hook — loads effective permissions (role defaults + DB overrides)
- Sidebar filtered by `can_view` permission
- `hasPermission(slug, action?)` helper used throughout the app

**Not in scope (phase 2):**
- Super admin permission management (bypass all checks)
- Customer-role permissions
- Backend route-level enforcement (phase 1 is UI-enforced)

---

## Permission Slug Reference

| Slug | Covers |
|---|---|
| `dashboard` | Admin home `/admin` |
| `revenue` | Invoices, Payments, Reports |
| `customers` | Customer list + detail |
| `bookings` | Bookings management |
| `vehicles` | Vehicle fleet |
| `locations` | Location management |
| `modules` | Module catalogue |
| `settings` | Settings page |
| `team` | Technicians, Workload, Staff, Performance (non-HR) |
| `hr` | Grafter HR section (also requires HR module) |

---

## Role Defaults

Applied when no DB override row exists for a user.

| Role | Default |
|---|---|
| `franchise_manager` | ALL slugs, ALL actions = `true` |
| `admin` | ALL slugs, ALL actions = `true` |
| `office_staff` | `dashboard`(view), `customers`(view+create+update), `bookings`(view+create) — rest denied |
| `technician` | `dashboard`(view) only |

---

## DB Schema — `user_permissions` table

```sql
CREATE TABLE IF NOT EXISTS user_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  permission_slug VARCHAR(50) NOT NULL,
  can_view    BOOLEAN NOT NULL DEFAULT TRUE,
  can_create  BOOLEAN NOT NULL DEFAULT TRUE,
  can_update  BOOLEAN NOT NULL DEFAULT TRUE,
  can_delete  BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by_id UUID REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission_slug)
);
```

---

## Implementation Plan

### Step 1 — DB Migration
**New file: `scripts/migrate_permissions.py`**
- Runs `CREATE TABLE IF NOT EXISTS user_permissions ...` against `DB8912C3F9_DATABASE_URL`
- Safe to re-run (idempotent)

### Step 2 — Backend Models & Schemas

**`backend/models.py`** — add `UserPermission` model + `permissions` relationship on `User`

**`backend/schemas.py`** — add:
```python
class PermissionEntry(BaseModel):
    permission_slug: str
    can_view: bool = True
    can_create: bool = True
    can_update: bool = True
    can_delete: bool = True

class PermissionUpdate(BaseModel):
    permissions: list[PermissionEntry]
```
Update `StaffResponse` to include `permissions: list[PermissionEntry]`

**`backend/dependencies.py`** — add:
```python
PERMISSION_SLUGS = ["dashboard","revenue","customers","bookings",
                    "vehicles","locations","modules","settings","team","hr"]

ROLE_DEFAULTS: dict[str, dict] = {
    "franchise_manager": {s: {"can_view":True,"can_create":True,"can_update":True,"can_delete":True} for s in PERMISSION_SLUGS},
    "admin":             {s: {"can_view":True,"can_create":True,"can_update":True,"can_delete":True} for s in PERMISSION_SLUGS},
    "office_staff": {
        "dashboard":  {"can_view":True, "can_create":False,"can_update":False,"can_delete":False},
        "customers":  {"can_view":True, "can_create":True, "can_update":True, "can_delete":False},
        "bookings":   {"can_view":True, "can_create":True, "can_update":False,"can_delete":False},
    },
    "technician": {
        "dashboard":  {"can_view":True, "can_create":False,"can_update":False,"can_delete":False},
    },
}

def get_effective_permissions(user: User, db: Session) -> list[PermissionEntry]:
    """Merge role defaults with any DB overrides for this user."""
```

**`backend/routes_staff.py`** — add two endpoints:
```
GET  /api/staff/:id/permissions  → returns effective permissions list
PUT  /api/staff/:id/permissions  → bulk upsert overrides
```

### Step 3 — Frontend Types & Hook

**`src/types.ts`** — add:
```tsx
export interface PermissionEntry {
  permission_slug: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
}
```

**New file: `src/hooks/usePermissions.tsx`**
- Context + provider wrapping the admin section
- Fetches `GET /api/staff/me/permissions` once on mount
- `hasPermission(slug: string, action: "view"|"create"|"update"|"delete" = "view") => boolean`
- `franchise_manager` and `admin` always return `true` (bypass, no fetch needed)

**`src/App.tsx`** — wrap admin routes with `<PermissionsProvider>`

### Step 4 — Sidebar Filtering

**`src/components/admin/Sidebar.tsx`** — extend `SidebarItem`:
```tsx
interface SidebarItem {
  label: string
  href?: string
  icon: React.ElementType
  submenu?: SidebarItem[]
  permissionSlug?: string   // NEW
}
```
Add `permissionSlug` to each item that maps to a slug. Filter with `hasPermission(slug, "view")`.

### Step 5 — Permissions Editor UI

**`src/pages/admin/hr/HREmployeeDetail.tsx`** — new "Access Permissions" card in Profile tab:

Layout per area:
```
┌─────────────────────────────────────────────────────┐
│  Revenue                      [View ●] [─────────]  │
│    Create ●  Update ●  Delete ●                     │
├─────────────────────────────────────────────────────┤
│  Customers                    [View ●] [─────────]  │
│    Create ●  Update ●  Delete ○                     │
└─────────────────────────────────────────────────────┘
```

- View toggle = master for that area (turning off view auto-disables CRUD)
- CRUD sub-toggles only shown/enabled when view is on
- Calls `PUT /api/staff/:id/permissions` immediately on change (optimistic)
- Not shown for `franchise_manager`/`admin` roles (they always have full access)

**`src/pages/admin/StaffManagement.tsx`** — same permissions card in staff detail drawer/modal for non-HR users

---

## File Change Summary

| File | Change |
|---|---|
| `scripts/migrate_permissions.py` | CREATE TABLE migration (new) |
| `backend/models.py` | Add `UserPermission` model |
| `backend/schemas.py` | Add `PermissionEntry`, `PermissionUpdate`; update `StaffResponse` |
| `backend/routes_staff.py` | Add GET + PUT `/staff/:id/permissions` |
| `backend/dependencies.py` | Add `ROLE_DEFAULTS`, `PERMISSION_SLUGS`, `get_effective_permissions()` |
| `src/types.ts` | Add `PermissionEntry` |
| `src/hooks/usePermissions.tsx` | New context + hook (new) |
| `src/App.tsx` | Wrap admin routes with `<PermissionsProvider>` |
| `src/components/admin/Sidebar.tsx` | Add `permissionSlug` field + filter by `hasPermission()` |
| `src/pages/admin/hr/HREmployeeDetail.tsx` | Add permissions editor card in Profile tab |
| `src/pages/admin/StaffManagement.tsx` | Add permissions editor in staff modal |

---

## Verification

1. `franchise_manager` login → all sections visible, `hasPermission` always true
2. `office_staff` login → sidebar shows only Dashboard, Customers, Bookings
3. In HR Employees > employee profile → grant Revenue view to office_staff → Revenue appears in their sidebar immediately after re-login
4. Toggle off "Create" on Customers → create button hidden on customers page
5. `technician` login → only Dashboard visible
6. Grant `vehicles` view to technician → Vehicle Fleet appears
