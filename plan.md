# Phase 3: Superadmin & Staff Management

## Context
Currently the app has:
- User registration auto-creates a franchise (first-time setup)
- All users belong to a franchise (franchise_id required)
- Admin routes (`/admin`) are for franchisee managers to manage their own data
- No platform-level superadmin area to manage franchises
- No staff management for either superadmin or franchisee

Goal: Add a complete superadmin area and staff management system.

## Scope & Non-Goals

### INCLUDED (Phase 3):
1. **Superadmin Area (`/superadmin`)**
   - View all franchises with key metrics
   - Franchise CRUD: create, edit, toggle active/inactive
   - Superadmin dashboard with platform-wide analytics
   
2. **Staff Management (Superadmin)**
   - View all staff across all franchises
   - Create/edit/delete staff users
   - Assign staff to franchises
   - Search and filter by franchise

3. **Staff Management (Franchisee)**
   - Each franchisee can manage their own staff
   - Create/edit/delete technicians, office staff
   - Invite staff via email (optional v1: manual account creation)
   - View staff roles and status

4. **Database Changes**
   - Add new roles: `SUPER_ADMIN`, `OFFICE_STAFF` to UserRole enum
   - Add `staff_type` column to User (technician, office_staff, etc.)
   - Add `invitation_token` and `invited_by` for optional invite workflow

### DEFERRED (Phase 4+):
- Email invitations for staff
- Staff performance metrics dashboard
- Franchise billing/commission system
- Franchise approval workflow
- Multi-location support per franchise

## Implementation Plan

### Backend

**1. Update Models** (`backend/models.py`)
- Add `SUPER_ADMIN`, `OFFICE_STAFF` to UserRole enum
- Add `staff_type` optional column to User model
- Update Franchise model to include approval_status, approved_at, notes fields

**2. Create Staff Routes** (`backend/routes_staff.py`)
- Routes for superadmin: GET/POST/PUT/DELETE users across all franchises
- Routes for franchisee: GET/POST/PUT/DELETE users in their franchise only
- Endpoints:
  - `GET /api/staff` - list staff (filtered by user's franchise or all if superadmin)
  - `POST /api/staff` - create staff user
  - `PUT /api/staff/{user_id}` - update staff
  - `DELETE /api/staff/{user_id}` - delete staff

**3. Create Superadmin Routes** (`backend/routes_superadmin.py`)
- Franchise management:
  - `GET /api/superadmin/franchises` - all franchises with metrics
  - `POST /api/superadmin/franchises` - create franchise
  - `PUT /api/superadmin/franchises/{franchise_id}` - edit franchise
  - `DELETE /api/superadmin/franchises/{franchise_id}` - deactivate franchise
  - `GET /api/superadmin/franchises/{franchise_id}/stats` - franchise metrics
- Superadmin dashboard:
  - `GET /api/superadmin/analytics` - platform-wide stats (total franchises, revenue, etc.)

**4. Update Dependencies** (`backend/dependencies.py`)
- Add `get_superadmin_user` - ensures user has SUPER_ADMIN role
- Add `get_franchisee_manager` - ensures user is franchise manager

**5. Update Schemas** (`backend/schemas.py`)
- Add `UserStaffCreate`, `UserStaffUpdate` schemas with staff_type, role
- Add `FranchiseCreate`, `FranchiseUpdate` schemas

### Frontend

**1. Create Superadmin Pages**
- `src/pages/superadmin/SuperadminDashboard.tsx` - Overview with franchise cards, platform metrics
- `src/pages/superadmin/FranchiseManagement.tsx` - Franchise list, create/edit/delete, toggle status
- `src/pages/superadmin/AllStaff.tsx` - Staff across all franchises, CRUD operations
- `src/pages/superadmin/FranchiseDetail.tsx` - View single franchise + its staff

**2. Create Staff Management Pages (Franchisee)**
- `src/pages/admin/StaffManagement.tsx` - List franchise staff, create/edit/delete
- Add "Staff" section to admin sidebar navigation

**3. Create Superadmin Layout**
- `src/components/superadmin/SuperadminLayout.tsx` - Layout wrapper with sidebar/topbar
- `src/components/superadmin/SuperadminSidebar.tsx` - Navigation for superadmin pages

**4. Update App Routes** (`src/App.tsx`)
- Add `/superadmin` route protection (only SUPER_ADMIN role)
- Add `/superadmin/*` child routes
- Add `/admin/staff` route for franchisee staff management

**5. Update Auth Context** (`src/hooks/useAuth.tsx`)
- Check for SUPER_ADMIN role on login

**6. Create Reusable Components**
- `src/components/StaffForm.tsx` - Form for create/edit staff (reuse in both superadmin + franchisee)
- `src/components/FranchiseCard.tsx` - Card displaying franchise info with quick actions

## Database Schema Changes

```
UserRole enum:
  - admin ✓ (existing)
  - franchise_manager ✓ (existing)
  - technician ✓ (existing)
  - customer ✓ (existing)
  - SUPER_ADMIN (new)
  - OFFICE_STAFF (new)

User table additions:
  - staff_type: String (nullable) - "technician", "office_manager", "admin"

Franchise table additions:
  - approval_status: String - "pending", "approved", "rejected"
  - approved_at: DateTime (nullable)
  - subscription_status: String - "active", "suspended", "cancelled"
```

## API Endpoints Summary

### Superadmin Staff Management
```
GET    /api/staff?franchise_id=<id>      - List all staff (no filter = all)
POST   /api/staff                        - Create staff user
PUT    /api/staff/{user_id}             - Update staff
DELETE /api/staff/{user_id}             - Delete staff
```

### Franchisee Staff Management
```
GET    /api/staff                        - List staff in current franchise
POST   /api/staff                        - Create staff in current franchise
PUT    /api/staff/{user_id}             - Update staff in current franchise
DELETE /api/staff/{user_id}             - Delete staff in current franchise
```

### Franchise Management (Superadmin Only)
```
GET    /api/superadmin/franchises       - List all franchises
POST   /api/superadmin/franchises       - Create franchise
PUT    /api/superadmin/franchises/{id}  - Update franchise
DELETE /api/superadmin/franchises/{id}  - Toggle franchise active/inactive
GET    /api/superadmin/franchises/{id}/stats  - Franchise metrics
GET    /api/superadmin/analytics        - Platform analytics
```

## Verification

1. **Login as SUPER_ADMIN**: Create test superadmin user, verify access to `/superadmin`
2. **Franchise Management**: Create, edit, view franchises; verify staff filtering by franchise
3. **Staff CRUD**: Create staff in superadmin, create staff as franchisee, verify isolation
4. **Role Protection**: Try accessing `/superadmin` as franchisee → should redirect
5. **Data Isolation**: Franchisee should only see their own staff; superadmin sees all

## Files to Create/Modify

**NEW:**
- `backend/routes_staff.py` - Staff CRUD routes
- `backend/routes_superadmin.py` - Franchise + superadmin analytics routes
- `src/pages/superadmin/SuperadminDashboard.tsx`
- `src/pages/superadmin/FranchiseManagement.tsx`
- `src/pages/superadmin/AllStaff.tsx`
- `src/pages/admin/StaffManagement.tsx`
- `src/components/superadmin/SuperadminLayout.tsx`
- `src/components/superadmin/SuperadminSidebar.tsx`
- `src/components/StaffForm.tsx`
- `src/components/FranchiseCard.tsx`

**MODIFY:**
- `backend/models.py` - Add UserRole.SUPER_ADMIN, update Franchise
- `backend/schemas.py` - Add staff/franchise schemas
- `backend/dependencies.py` - Add superadmin/franchisee guards
- `backend/routes_auth.py` - Create initial superadmin on first run (optional)
- `src/App.tsx` - Add superadmin routes
- `src/hooks/useAuth.tsx` - Update role checks
- `src/pages/admin/AdminDashboard.tsx` - Add staff link to sidebar
- `src/components/admin/Sidebar.tsx` - Add staff link
- `routes.py` - Register new routers
