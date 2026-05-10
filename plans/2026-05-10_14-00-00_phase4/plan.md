# Phase 4: Email Invitations, Staff Performance, Billing, Franchise Approval, Multi-Location

## Context

Phases 1–3 delivered: auth, franchisee admin dashboard, superadmin platform with staff/franchise management.

Phase 4 adds the five deferred features in priority order:
1. **Email invitations for staff** — replace manual account creation with token-based email invites
2. **Staff performance metrics** — per-technician job/revenue stats in admin dashboard
3. **Franchise billing/commission** — superadmin sets commission rates, tracks franchise revenue owed to platform
4. **Franchise approval workflow** — new franchises start as "pending", superadmin approves/rejects
5. **Multi-location support** — each franchise can have multiple locations (branches)

---

## Feature 1: Email Invitations for Staff

### Context
Currently staff are created with a password set by the manager. Instead, managers should invite staff by email; staff receive a link to set their own password.

### Database Changes (`backend/models.py`)
Add to `User`:
```python
invitation_token = Column(String(255), nullable=True, unique=True)
invitation_token_expires = Column(DateTime, nullable=True)
invited_by_id = Column(UUID, ForeignKey("users.id"), nullable=True)
invitation_accepted_at = Column(DateTime, nullable=True)
```

### Backend
- **`backend/routes_staff.py`**: Add `POST /api/staff/invite` — creates an inactive user record with a random token, returns the invite URL (no real email yet — display the link in the UI)
- **`backend/routes_auth.py`**: Add `GET /api/auth/invite/{token}` — validate token; `POST /api/auth/accept-invite` — accept token + set password, mark user active
- **`backend/schemas.py`**: `StaffInviteRequest`, `InviteAcceptRequest`, `InviteTokenResponse`
- Token: `secrets.token_urlsafe(32)`, expires 72h

### Frontend
- **`src/pages/admin/StaffManagement.tsx`**: Add "Invite Staff" button → dialog with email + role. On success show invite link (copy to clipboard)
- **`src/pages/AcceptInvitePage.tsx`**: New public page at `/accept-invite?token=xxx` — set first/last name + password form
- **`src/App.tsx`**: Add `/accept-invite` route (no auth required)

---

## Feature 2: Staff Performance Metrics

### Context
Admins want to see per-technician stats: jobs completed, revenue generated, avg job time.

### Backend
- **`backend/routes_analytics.py`**: Add `GET /api/analytics/staff-performance` — returns per-technician job counts, completion rate, total revenue from jobs they completed, avg days-to-complete

### Frontend
- **`src/pages/admin/StaffPerformance.tsx`**: New page — bar chart of jobs completed per tech, table with stats per staff member
- **`src/components/admin/Sidebar.tsx`**: Add "Performance" nav item
- **`src/App.tsx`**: Add `/admin/performance` route

---

## Feature 3: Franchise Billing & Commission

### Context
Platform charges franchises a commission. Superadmin sets commission rates per franchise, tracks what each franchise owes.

### Database Changes (`backend/models.py`)
Add to `Franchise`:
```python
commission_rate = Column(Float, default=0.10)  # 10% default
billing_email = Column(String(255), nullable=True)
```

Add new model `FranchiseBillingRecord`:
```python
id, franchise_id, period_start, period_end,
gross_revenue, commission_rate, commission_amount,
status (pending/invoiced/paid), notes, created_at
```

### Backend
- **`backend/routes_superadmin.py`**: 
  - `GET /api/superadmin/billing` — list billing records across all franchises
  - `POST /api/superadmin/billing/generate` — generate billing records for a date range
  - `PUT /api/superadmin/franchises/{id}` — add commission_rate to update payload
- **`backend/schemas.py`**: `FranchiseBillingRecord` schemas

### Frontend
- **`src/pages/superadmin/BillingManagement.tsx`**: New page — table of franchises with commission rates, billing history, "Generate Invoice" button
- **`src/components/superadmin/SuperadminSidebar.tsx`**: Add "Billing" nav item
- **`src/App.tsx`**: Add `/superadmin/billing` route

---

## Feature 4: Franchise Approval Workflow

### Context
`approval_status` column already exists on `Franchise` (default: `"approved"`). Need to wire up: new franchises start as `"pending"`, superadmin approves/rejects with optional note, franchisee is blocked until approved.

### Backend
- **`backend/routes_superadmin.py`**: Add `POST /api/superadmin/franchises/{id}/approve` and `POST /api/superadmin/franchises/{id}/reject`
- **`backend/routes_auth.py`**: After login, if user's franchise has `approval_status != "approved"`, return 403 with `"franchise_pending_approval"` error code
- **`backend/routes_superadmin.py`**: `POST /api/superadmin/franchises` — set `approval_status="pending"` by default (currently hardcodes "approved")

### Frontend
- **`src/pages/superadmin/FranchiseManagement.tsx`**: Add approve/reject buttons on pending franchises, show approval badge
- **`src/pages/LoginPage.tsx`**: Handle `franchise_pending_approval` error with a clear message
- **`src/pages/PendingApprovalPage.tsx`**: Landing page shown after login if franchise pending

---

## Feature 5: Multi-Location Support

### Context
A franchise can operate from multiple physical locations (branches). Jobs and staff can be assigned to a location.

### Database Changes (`backend/models.py`)
Add new model `FranchiseLocation`:
```python
id, franchise_id, name, address, city, state,
postal_code, country, phone, is_primary, is_active, created_at
```

Add optional FK to existing models:
- `User.location_id` (nullable)
- `Job.location_id` (nullable)

### Backend
- **`backend/routes_locations.py`** (new): CRUD for locations scoped to franchise
  - `GET /api/locations` — list locations in current franchise
  - `POST /api/locations` — create location (franchise manager only)
  - `PUT /api/locations/{id}` — update
  - `DELETE /api/locations/{id}` — soft delete
- **`routes.py`**: Register new router

### Frontend
- **`src/pages/admin/LocationManagement.tsx`**: New page — list/create/edit locations for current franchise
- **`src/components/admin/Sidebar.tsx`**: Add "Locations" nav item
- **`src/App.tsx`**: Add `/admin/locations` route

---

## Implementation Order

| Phase | Feature | Backend | Frontend |
|-------|---------|---------|----------|
| 4-1 | Email Invitations | routes_staff.py, routes_auth.py, schemas.py, models.py | StaffManagement.tsx, AcceptInvitePage.tsx, App.tsx |
| 4-2 | Staff Performance | routes_analytics.py | StaffPerformance.tsx, Sidebar.tsx, App.tsx |
| 4-3 | Franchise Billing | models.py, routes_superadmin.py, schemas.py | BillingManagement.tsx, SuperadminSidebar.tsx, App.tsx |
| 4-4 | Franchise Approval | routes_superadmin.py, routes_auth.py | FranchiseManagement.tsx, LoginPage.tsx, PendingApprovalPage.tsx |
| 4-5 | Multi-Location | models.py, routes_locations.py, routes.py | LocationManagement.tsx, Sidebar.tsx, App.tsx |

---

## Verification

1. **Invitations**: Invite staff → copy link → open in incognito → accept invite → login with new credentials
2. **Performance**: Create a few completed jobs → open Performance page → stats visible per technician
3. **Billing**: Set commission rate on a franchise → generate billing for a date range → record appears
4. **Approval**: Create franchise via superadmin (status=pending) → try login as that franchise's manager → see pending page → superadmin approves → login succeeds
5. **Locations**: Create 2 locations → assign a job to a location → filter jobs by location
