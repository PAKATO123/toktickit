# Lab 3 — Implementation Plan & Feature Breakdown
**TokTickIT · Users, Roles, IT Staff Ticketing, and Admin Screens**

> Each feature below is scoped to be a self-contained, peer-reviewable Pull Request.
> A feature is testable once it **and every feature listed under its prerequisites** are merged.

---

## Current Baseline (Lab 2, Merged)

| Component | Status / Baseline |
|---|---|
| PostgreSQL Schema | `Category`, `Requester`, `RelatedSystem`, `Ticket`, `Attachment` |
| Requester Ticketing MVP | Ticket creation, attachments (upload/download/soft-delete), search, filter, sort, pagination |
| Design Language | Zen Green theme tokens, reusable cards, badges, buttons, form controls |
| Reference Data Seed | Idempotent seed script (`prisma/seed.ts`) |

---

## Feature List & Branch Roadmap

### F-01 · Database Schema Evolution & Data Migration
**Prerequisites:** Lab 2 baseline  
**Branch:** `feature/lab03-01-schema-and-migration`

Expand the PostgreSQL Prisma schema and seed script to support real users, authentication, roles, ticket ownership, comments, notes, and status workflow.

**Scope:**
- Update `server/prisma/schema.prisma`:
  - `Role` Enum: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`
  - `User` model: `id`, `email` (unique), `passwordHash`, `name`, `role`, `isActive`, `mustChangePassword`, `createdAt`, `updatedAt`
  - `Ticket` model additions: `assignedToId` (User relation), `itPriority` (enum string), `isRequesterResolved` (boolean), timestamps
  - `PublicComment` model: `id`, `ticketId`, `authorId`, `content`, `createdAt`
  - `InternalNote` model: `id`, `ticketId`, `authorId`, `content`, `createdAt`
- Data Migration Script:
  - Migrate Lab 2 `Requester` rows into `User` records (`role = REQUESTER`, `passwordHash` hashed `Password123!`, `mustChangePassword = true`).
  - Link `Ticket.requesterId` directly to `User.id`.
- Idempotent Seed Script (`prisma/seed.ts`):
  - 4 active + 1 inactive Requesters (`requester1@toktickit.local` ... `requester5@toktickit.local`)
  - 3 active + 1 inactive IT Staff (`staff1@toktickit.local` ... `staff4@toktickit.local`)
  - 1 active Administrator (`admin@toktickit.local`)
  - 10+ realistic Tickets distributed across statuses (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Pending Verification`, `Resolved`, `Closed`), priorities, and assignments
  - Sample Public Comments and confidential Internal Notes

**Testable when F-01 is done:**
- `npx prisma migrate dev` executes without errors.
- `npm run prisma:seed` runs twice without errors or duplicate records.
- Database inspection confirms migrated `User` rows, `Ticket.assignedToId`, `PublicComment`, and `InternalNote` structures.

---

### F-02 · Authentication Backend & Auth Middleware
**Prerequisites:** F-01  
**Branch:** `feature/lab03-02-auth-backend`

Implement backend session management, credential validation, password hashing, and authentication API endpoints.

**Scope:**
- Password Hashing: `bcryptjs` with salt rounds >= 10.
- Auth Middleware & Guards:
  - Session tracking using HttpOnly cookies (`express-session` or signed session cookie).
  - `requireAuth`: Verifies active session, checks `isActive = true`.
  - `requireRole(...roles)`: Enforces role-based route authorization.
  - `requireFirstLoginCompleted`: Redirects/blocks users with `mustChangePassword = true`.
- Authentication Endpoints:
  - `POST /api/auth/login`: Validates active user credentials, establishes session, returns user identity and role.
  - `POST /api/auth/logout`: Destroys session and clears cookie.
  - `GET /api/auth/me`: Returns current authenticated user context.
  - `POST /api/auth/change-password`: Validates password complexity (8+ chars, uppercase, lowercase, digit), updates hash, sets `mustChangePassword = false`.
- API Integration Tests (`server/tests/lab-03/auth.api.test.ts`):
  - Happy path login, logout, profile fetch, password change.
  - Invalid password (401), inactive account (401), weak new password (400).

**Testable when F-02 is done:**
- `POST /api/auth/login` returns `200 OK` with session cookie for valid credentials.
- Deactivated user login returns `401 Unauthorized`.
- User with `mustChangePassword = true` attempting restricted endpoints receives forced password change error.
- All auth unit and API tests in `auth.api.test.ts` pass.

---

### F-03 · Server-Side Authorization & Requester Refactoring
**Prerequisites:** F-02  
**Branch:** `feature/lab03-03-authorization-and-requester-refactor`

Refactor Lab 2 Requester endpoints to use session identity and enforce server-side data isolation.

**Scope:**
- Remove reliance on client-supplied `requesterId` parameters; bind all Requester queries to `req.user.id`.
- Scoping guards:
  - `GET /api/tickets/my-tickets`: Returns only tickets where `requesterId === req.user.id`.
  - `POST /api/tickets`: Sets `requesterId = req.user.id` automatically.
  - `GET /api/tickets/:id` & attachments: Rejects cross-requester access with `403 Forbidden`.
- Requester Resolution Request Endpoint (`PATCH /api/tickets/:id/resolve-indication`):
  - Requesters can request problem resolution on their owned ticket.
  - Sets `isRequesterResolved = true` and updates status to `Pending Verification`.
- API Integration Tests (`server/tests/lab-03/authorization.api.test.ts`):
  - Requester isolation verification.
  - Cross-user ticket access rejection (`403 Forbidden`).

**Testable when F-03 is done:**
- Requesters can only access their own tickets and attachments.
- Passing another user's `requesterId` in request bodies is ignored.
- Requester resolution request updates ticket status to `Pending Verification`.
- `authorization.api.test.ts` passes.

---

### F-04 · IT Staff Ticket Queue & Workflow Backend
**Prerequisites:** F-02, F-03  
**Branch:** `feature/lab03-04-staff-queue-and-workflow-backend`

Implement the shared IT Staff Ticket Queue API, ticket ownership management, priority management, and status state machine workflow.

**Scope:**
- Queue Retrieval (`GET /api/tickets/staff-queue`):
  - Accessible to `IT_STAFF` and `ADMINISTRATOR` roles only (`403` for Requesters).
  - Search: Substring keyword match on `ticketNumber`, `summary`, `description`.
  - Filters: `status`, `itPriority`, `assignment` (`unassigned`, `me`, `assignedToId`).
  - Sorting: `createdAt`, `itPriority`, `currentStatus` (`asc` / `desc`).
  - Pagination: `page`, `pageSize` (10, 25, 50).
- Ownership Endpoints:
  - `PATCH /api/tickets/:id/claim`: Sets `assignedToId = req.user.id`.
  - `PATCH /api/tickets/:id/assign`: Reassigns `assignedToId` to specified IT Staff user.
- Priority Endpoint (`PATCH /api/tickets/:id/priority`):
  - Updates `itPriority` (`Urgent`, `High`, `Medium`, `Low`).
- Status Workflow Endpoint (`PATCH /api/tickets/:id/status`):
  - Validates status transitions per state machine matrix:
    - `New` ➔ `Open`, `In Progress`, `Cancelled`
    - `Open` / `In Progress` / `Waiting for Requester` ➔ `Pending Verification` (Requester) or `Resolved` / `Closed` / `Cancelled` (Staff)
    - `Pending Verification` ➔ `Resolved` / `Closed` (Staff confirm) OR `In Progress` / `Open` (Staff revert if unsolved, resetting `isRequesterResolved = false`)
    - `Resolved` ➔ `Closed`, `Reopened`
    - `Closed` ➔ `Reopened`
- API Integration Tests (`server/tests/lab-03/staff-queue.api.test.ts`, `staff-detail.api.test.ts`):
  - Queue search, filtering, sorting, pagination.
  - Claim, assign, priority update.
  - Valid vs invalid status transitions (400 Bad Request).
  - Staff revert of `Pending Verification` ticket back to `In Progress`.

**Testable when F-04 is done:**
- `GET /api/tickets/staff-queue` returns paginated system tickets for Staff/Admin, returns `403` for Requester.
- Ticket claiming and reassignment update `assignedToId`.
- Invalid status transition (e.g. `New` ➔ `Closed`) returns `400 Bad Request`.
- Staff revert resets status to `In Progress` and clears `isRequesterResolved`.
- API test suites pass.

---

### F-05 · Public Comments & Confidential Internal Notes Backend
**Prerequisites:** F-02, F-03  
**Branch:** `feature/lab03-05-comments-notes-backend`

Implement append-only Public Comments and confidential Internal Notes API endpoints.

**Scope:**
- Public Comments API:
  - `GET /api/tickets/:id/comments`: Returns public comments (Ticket Owner, Staff, Admin).
  - `POST /api/tickets/:id/comments`: Creates public comment (Ticket Owner, Staff, Admin).
- Internal Notes API:
  - `GET /api/tickets/:id/notes`: Returns confidential notes (Staff, Admin only; `403` for Requester).
  - `POST /api/tickets/:id/notes`: Creates confidential note (Staff, Admin only; `403` for Requester).
- Validation: Non-empty text, max 2000 chars, automatic author and timestamp binding.
- API Integration Tests (`server/tests/lab-03/comments-notes.api.test.ts`):
  - Happy path posting and reading comments/notes.
  - Rejection of Requester access to Internal Notes (`403 Forbidden`).

**Testable when F-05 is done:**
- Ticket owners and IT Staff can read/write Public Comments.
- Calling Internal Notes API as Requester returns `403 Forbidden`.
- IT Staff and Admins can create and view Internal Notes.
- `comments-notes.api.test.ts` passes.

---

### F-06 · Minimalist Administrator User Management Backend
**Prerequisites:** F-02  
**Branch:** `feature/lab03-06-admin-users-backend`

Implement Administrator user administration endpoints and safety guards.

**Scope:**
- Endpoints (restricted to `ADMINISTRATOR` role; `403` for others):
  - `GET /api/users`: Returns user list with search (name/email) and role filter.
  - `POST /api/users`: Creates user account (name, email, role, initial password, sets `mustChangePassword = true`, `isActive = true`). Rejects duplicate email (`409 Conflict`).
  - `PATCH /api/users/:id`: Updates name, email, role, `isActive`. Enforces safety rules:
    - Admin self-deactivation guard (`400 Bad Request`).
    - Last active Admin deactivation guard (`400 Bad Request`).
  - `POST /api/users/:id/reset-password`: Sets new initial password, forcing `mustChangePassword = true`.
- API Integration Tests (`server/tests/lab-03/users-admin.api.test.ts`):
  - User creation, update, password reset.
  - Duplicate email rejection (`409`).
  - Self-deactivation and last-admin deactivation rejection (`400`).
  - Non-Admin access rejection (`403`).

**Testable when F-06 is done:**
- Admin can list, filter, create, edit users, and reset initial passwords.
- Non-Admin accessing `/api/users` receives `403 Forbidden`.
- Duplicate email returns `409 Conflict`.
- Admin self-deactivation and last-admin deactivation return `400 Bad Request`.
- `users-admin.api.test.ts` passes.

---

### F-07 · Authentication & Password Change UI (Zen Green Shell)
**Prerequisites:** F-02, F-03  
**Branch:** `feature/lab03-07-auth-ui-and-shell`

Implement the frontend Login screen, Mandatory Password Change modal, and updated Application Shell.

**Scope:**
- Login Screen (`/login`): Email & Password fields, error alert banner, session state setup.
- Mandatory Password Change Modal (`/change-password`): Displays automatically when `mustChangePassword = true`, blocks normal app access until valid new password is saved, real-time password rule checklist.
- Application Shell Update:
  - Replaces Lab 2 `Development Requester` dropdown with active user display (`Name [Role]`).
  - Navigation tabs filtered by role (`Requester`: My Tickets, Create Ticket; `IT Staff`: Queue; `Admin`: User Management, Queue).
  - User profile menu with "Change Password" and "Sign Out" actions.
- Component Tests (`client/src/lab-03/__tests__/Login.test.tsx`, `ChangePassword.test.tsx`).

**Testable when F-07 is done:**
- Logging in with valid credentials opens the role-based shell.
- User requiring password change sees non-dismissible modal until saved.
- Logout clears context and redirects to `/login`.
- Component tests pass.

---

### F-08 · IT Staff Ticket Queue & Detail UI
**Prerequisites:** F-04, F-05, F-07  
**Branch:** `feature/lab03-08-staff-queue-detail-ui`

Build the IT Staff Ticket Queue screen and Ticket Detail management views.

**Scope:**
- Ticket Queue View (`/staff/queue`):
  - Search bar (number, summary, description).
  - Status, IT Priority, and Assignment filter dropdowns.
  - Table with status/priority badges, assignee column, sorting, and pagination footer.
- Ticket Detail View (`/staff/tickets/:id`):
  - Sidebar: Claim button, Reassign dropdown, IT Priority selector, Status transition dropdown.
  - `Pending Verification` status support: Displays "Confirm Resolution" and "Revert to In Progress" buttons for Staff.
  - Tabbed activity feed: Public Comments feed + Confidential Internal Notes feed (yellow tint card).
- Requester Resolution Panel (on Requester ticket detail):
  - "Mark as Resolved" button.
  - Confirmation popup modal: *"Are you sure you want to mark this problem as resolved?"* `[Cancel]` `[Confirm]`.
  - Once confirmed, ticket status becomes `Pending Verification` and button becomes disabled/greyed-out showing `"Resolution Requested ✓"`.
- Component Tests (`client/src/lab-03/__tests__/StaffQueue.test.tsx`, `StaffDetail.test.tsx`).

**Testable when F-08 is done:**
- Staff Queue renders system tickets with working search, filters, and pagination.
- Staff can claim/reassign tickets, change priority, and transition status.
- Requester resolution request shows confirmation modal, transitions status to `Pending Verification`, and greys out button.
- Staff can revert `Pending Verification` back to `In Progress`.
- Public comments and internal notes feeds post and display cleanly.
- Component tests pass.

---

### F-09 · Minimalist Administrator User Management UI
**Prerequisites:** F-06, F-07  
**Branch:** `feature/lab03-09-admin-user-management-ui`

Build the Administrator User Management screen and modals.

**Scope:**
- User Management Screen (`/admin/users`):
  - Search bar (name/email) and Role filter dropdown.
  - User table: Name, Email, Role badge, Status pill (`Active`/`Inactive`), Password Change Required badge, Actions.
- Modals & Drawers:
  - Create User Modal (Name, Email, Role single-select, Initial Password).
  - Edit User Modal (Name, Email, Role, Active checkbox).
  - Set Initial Password Modal (User email read-only, New Initial Password input).
- Feedback & Safety: Error banners for duplicate email, self-deactivation warning banner.
- Component Tests (`client/src/lab-03/__tests__/UserManagement.test.tsx`).

**Testable when F-09 is done:**
- Admin can view, search, and filter user list.
- Creating a user, editing an account, and resetting passwords update UI dynamically.
- Safety error feedback displays when self-deactivation is attempted.
- Component tests pass.

---

### F-10 · E2E Testing, Visual Audits & Definition of Done Verification
**Prerequisites:** F-07, F-08, F-09  
**Branch:** `feature/lab03-10-e2e-and-dod`

Implement Playwright end-to-end test suites, perform responsive design audits, capture required submission evidence, and verify Product Definition of Done.

**Scope:**
- Playwright E2E Suites (`e2e/lab-03/`):
  - `authentication.spec.ts`: Login, mandatory first-login password change, invalid login, logout.
  - `staff-ticket-flow.spec.ts`: Staff login, queue search/filter, claiming ticket, setting priority, posting internal note, requester resolution request, staff revert, staff resolution.
  - `user-administration.spec.ts`: Admin login, user creation, editing account, initial password reset, safety guard verification.
- Visual Audit & Screenshots:
  - Save desktop (1440px), tablet (768px), and mobile (375px) screenshots to `artifacts/lab-03/screenshots/`.
- Reviewer & AI Documentation:
  - Finalize `docs/lab-03/reviewer.md` with PR links and partner review approvals.
  - Finalize `docs/lab-03/ai-use.md` with prompts and reflection.

**Testable when F-10 is done:**
- All Playwright E2E tests pass headlessly (`npx playwright test`).
- Full regression suite across Lab 2 and Lab 3 passes cleanly.
- Product Definition of Done checklist fully satisfied.