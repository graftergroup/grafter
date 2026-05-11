# HR Module

## Context
A gated feature module (slug: `"hr"`) that unlocks a full HR suite in the franchise admin. Activated via the existing module system. Separate payroll module planned later — HR includes a Payroll nav stub that upsells/requests the payroll module if not active.

## Module Gate Architecture (new infrastructure, used by all future modules)

### `src/hooks/useActiveModules.tsx` — new hook
- Fetches `GET /api/modules` once on mount, caches in context
- Returns `{ hasModule(slug: string): boolean, modules, loading }`
- Provider wraps `AdminTabLayout` in `App.tsx`

### `src/components/ModuleGate.tsx` — new component
```tsx
<ModuleGate slug="hr" requestSlug="hr">
  {/* rendered only when active */}
</ModuleGate>
```
- If `hasModule(slug)` → renders children
- If not → renders a locked card with module name, description, price, "Request Access" button
- Used to gate each HR sub-page so direct-URL access is also blocked

---

## Admin Sidebar HR Section

`src/components/admin/Sidebar.tsx` — add HR group after Team, conditionally shown when `hasModule("hr")`:

```
HR (top-level collapsible)
  ├── Employees         /admin/hr/employees
  ├── Calendar          /admin/hr/calendar
  ├── Rotas & Shifts    /admin/hr/rotas
  ├── Documents         /admin/hr/documents
  ├── Performance       /admin/hr/performance
  ├── Expenses          /admin/hr/expenses
  ├── Payroll           /admin/hr/payroll   ← shows payroll upsell if "payroll" module inactive
  └── Recruitment       /admin/hr/recruitment
```

`useTabs.tsx` — add 8 route labels for all `/admin/hr/*` routes.

---

## Backend

### New models (`backend/models.py`)

**`LeaveRequest`** — `leave_requests`
| col | type | notes |
|-----|------|-------|
| id | UUID PK | |
| franchise_id | FK → franchises | |
| employee_id | FK → users | |
| leave_type | str | `annual` / `sick` / `unpaid` / `other` |
| start_date | DateTime | |
| end_date | DateTime | |
| days | Float | calculated, stored |
| reason | Text nullable | |
| status | str | `pending` / `approved` / `rejected` |
| reviewed_by_id | FK → users nullable | |
| reviewed_at | DateTime nullable | |
| created_at / updated_at | DateTime | |

**`Shift`** — `shifts`
| col | type | notes |
|-----|------|-------|
| id | UUID PK | |
| franchise_id | FK → franchises | |
| employee_id | FK → users | |
| shift_date | DateTime | |
| start_time | str | "09:00" |
| end_time | str | "17:00" |
| role | str nullable | e.g. "Technician" |
| notes | Text nullable | |
| created_at | DateTime | |

**`EmployeeDocument`** — `employee_documents`
| col | type | notes |
|-----|------|-------|
| id | UUID PK | |
| franchise_id | FK → franchises | |
| employee_id | FK → users | |
| title | str | e.g. "Contract", "ID Verification" |
| doc_type | str | `contract` / `id` / `certificate` / `other` |
| file_url | str | stored URL or path |
| notes | Text nullable | |
| uploaded_by_id | FK → users | |
| created_at | DateTime | |

**`PerformanceReview`** — `performance_reviews`
| col | type | notes |
|-----|------|-------|
| id | UUID PK | |
| franchise_id | FK → franchises | |
| employee_id | FK → users | |
| reviewer_id | FK → users | |
| review_date | DateTime | |
| period | str | e.g. "Q1 2026" |
| overall_rating | Integer | 1–5 |
| goals | Text nullable | |
| strengths | Text nullable | |
| improvements | Text nullable | |
| notes | Text nullable | |
| status | str | `draft` / `completed` |
| created_at / updated_at | DateTime | |

**`ExpenseClaim`** — `expense_claims`
| col | type | notes |
|-----|------|-------|
| id | UUID PK | |
| franchise_id | FK → franchises | |
| employee_id | FK → users | |
| description | str | |
| amount | Float | |
| category | str | `travel` / `equipment` / `meals` / `other` |
| expense_date | DateTime | |
| receipt_url | str nullable | |
| status | str | `pending` / `approved` / `rejected` |
| reviewed_by_id | FK → users nullable | |
| reviewed_at | DateTime nullable | |
| notes | Text nullable | |
| created_at | DateTime | |

**`JobPosting`** — `job_postings`
| col | type | notes |
|-----|------|-------|
| id | UUID PK | |
| franchise_id | FK → franchises | |
| title | str | |
| description | Text | |
| location | str nullable | |
| employment_type | str | `full_time` / `part_time` / `casual` |
| salary_min / salary_max | Float nullable | |
| requirements | Text nullable | |
| status | str | `draft` / `open` / `closed` |
| posted_at | DateTime nullable | |
| closes_at | DateTime nullable | |
| created_at / updated_at | DateTime | |

Add relationships on `User`: `leave_requests`, `shifts`, `documents`, `reviews_given`, `expense_claims`

### `backend/routes_hr.py` — new file, all routes under `/api/hr/*`

```
GET  /api/hr/employees                 list staff for franchise
GET  /api/hr/employees/:id             employee detail (with leave, docs, reviews)
GET  /api/hr/leave                     list leave requests
POST /api/hr/leave                     create leave request
PUT  /api/hr/leave/:id                 approve/reject/update
GET  /api/hr/shifts                    list shifts (date range filter)
POST /api/hr/shifts                    create shift
PUT  /api/hr/shifts/:id                update shift
DELETE /api/hr/shifts/:id              delete shift
GET  /api/hr/documents                 list docs (optional employee_id filter)
POST /api/hr/documents                 create doc record
DELETE /api/hr/documents/:id           delete doc record
GET  /api/hr/performance               list reviews
POST /api/hr/performance               create review
PUT  /api/hr/performance/:id           update review
GET  /api/hr/expenses                  list expenses
POST /api/hr/expenses                  create expense
PUT  /api/hr/expenses/:id              approve/reject
GET  /api/hr/recruitment               list job postings
POST /api/hr/recruitment               create posting
PUT  /api/hr/recruitment/:id           update posting
DELETE /api/hr/recruitment/:id         delete posting
```

All routes: auth via `get_auth_user`, scoped to `user.franchise_id`. No module enforcement on the backend (module gate is a frontend UX concern).

### `routes.py` — register `hr_router`

---

## Frontend Pages

All pages live under `src/pages/admin/hr/`. Each imports `AdminLayout` and is wrapped by `<ModuleGate slug="hr">`.

**`HREmployees.tsx`**
- DataTable of staff (reuses existing `/api/staff` + enhances with HR columns: contract type, leave balance, employment start date)
- Name cell navigates to `/admin/hr/employees/:id`
- "Add Employee" = invite flow (existing)

**`HREmployeeDetail.tsx`**
- Inner tabs: Profile / Leave / Shifts / Documents / Reviews / Expenses
- Registers dynamic tab via `registerTab`

**`HRCalendar.tsx`**
- Month-view calendar showing leave requests (colour-coded by type) + shifts
- Uses simple CSS grid calendar, no external lib
- Toggle: show leave / show shifts / show both
- Click a day to open a side panel with that day's details

**`HRRotas.tsx`**
- Week-view shift planner: rows = employees, columns = Mon–Sun
- Shift blocks show start/end time, role
- Click cell → create shift dialog
- Click shift → edit/delete

**`HRDocuments.tsx`**
- DataTable of all documents across all employees
- Columns: employee, title, type chip, uploaded date, actions
- Upload = file URL input (no binary upload for now, just URL + metadata)
- Doc type filter

**`HRPerformance.tsx`**
- DataTable of reviews with overall rating stars
- Create Review dialog: employee, period, ratings, text fields
- Click row → expand inline or detail modal

**`HRExpenses.tsx`**
- DataTable: employee, description, category, amount, date, status chip
- Approve/Reject inline action buttons on pending rows
- Create Expense dialog for self-submission

**`HRPayroll.tsx`**
- If `hasModule("payroll")`: placeholder "Payroll module content coming soon"
- If not: `<ModuleGate slug="payroll">` — shows upsell card with Request Access

**`HRRecruitment.tsx`**
- DataTable of job postings: title, type, status, posted date, actions
- Create/Edit posting dialog: title, description, employment type, location, salary range, closes date, status
- Status chip: Draft (grey) / Open (green) / Closed (muted)

---

## Routes + Tabs

`src/App.tsx` — add 9 routes inside admin layout group:
```
/admin/hr/employees
/admin/hr/employees/:id
/admin/hr/calendar
/admin/hr/rotas
/admin/hr/documents
/admin/hr/performance
/admin/hr/expenses
/admin/hr/payroll
/admin/hr/recruitment
```

`src/hooks/useTabs.tsx` — 8 route labels (employees/:id is dynamic via `registerTab`)

---

## Implementation Order

1. **Infrastructure**: `useActiveModules` hook + provider in `App.tsx`, `ModuleGate` component
2. **Backend**: models → `routes_hr.py` → register router
3. **Sidebar**: add HR section with `hasModule("hr")` gate + useTabs labels + App.tsx routes
4. **Employees + EmployeeDetail**: list + detail with inner tabs
5. **Calendar**: month-view leave/shift calendar
6. **Rotas & Shifts**: week-view planner
7. **Documents**: table + upload form
8. **Performance**: reviews table + create dialog
9. **Expenses**: claims table + approve/reject
10. **Payroll stub + Recruitment**
11. TypeScript check + commit

## Verification
1. Create HR module in superadmin (slug: `"hr"`)
2. Activate on test franchise
3. Admin sidebar shows HR section
4. All 8 sub-pages load without errors
5. Leave request round-trip: create → approve
6. Payroll page shows upsell when payroll module inactive
7. Deactivate HR module → sidebar HR section disappears, direct URL shows gate card
