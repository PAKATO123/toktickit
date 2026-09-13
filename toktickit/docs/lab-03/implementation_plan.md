# Lab 3 — Implementation Plan & Feature Breakdown
**TokTickIT · Users, Roles, IT Staff Ticketing, and Admin Screens**

> Each feature below is scoped to be a self-contained, peer-reviewable Pull Request.
> A feature is testable once it **and every feature listed under its prerequisites** are merged.

---

## Current Status Overview

| Feature | Branch Name | Scope Summary | Status |
|---|---|---|---|
| **F-01** | `feature/lab03-01-schema-and-migration` | Database Schema Evolution (`User`, `Role`, `PublicComment`, `InternalNote`), Data Migration, Seed Script | ✅ Merged |
| **F-02** | `feature/lab03-02-auth-backend` | Authentication Backend, Password Hashing, Session Management (`express-session`), Auth Middleware | ✅ Merged |
| **F-03** | `feature/lab03-03-authorization-and-requester-refactor` | Server-Side Authorization Guards, Requester Isolation, Resolution Indication Backend | ✅ Merged |
| **F-04** | `feature/lab03-04-staff-queue-and-workflow-backend` | IT Staff Queue Backend, Claim/Assign API, Status State Machine, Comments & Notes API | ✅ Merged |
| **F-05** | `feature/lab03-05-auth-ui` | Authentication UI (Login Form, Mandatory Password Change Modal, AppShell with User Context) | ✅ Merged |
| **F-06** | `feature/lab03-06-requester-resolution-ui` | Requester Resolution Indication UI ("I consider this issue resolved"), Confirmation Modal, Badges | 📤 Pushed |
| **F-07** | `feature/lab03-07-staff-queue-ui` | IT Staff Ticket Queue Page UI (Search, Status/Priority/Assignment Filters, Sort, Pagination) | ⏳ Up Next |
| **F-08** | `feature/lab03-08-staff-ticket-detail-ui` | IT Staff Ticket Detail View (Claim, Reassign, Status Transition, Public Comments & Internal Notes Feed) | 📅 Planned |
| **F-09** | `feature/lab03-09-admin-users` | Administrator User Management Backend & UI (`/api/users`, User List, Create/Edit Modals, Safety Guards) | 📅 Planned |
| **F-10** | `feature/lab03-10-e2e-and-docs` | Playwright E2E Testing, Visual Audits, Documentation & Definition of Done Verification | 📅 Planned |

---

## Detailed Feature Specifications

### F-01 · Database Schema Evolution & Data Migration
**Prerequisites:** Lab 2 baseline  
**Branch:** `feature/lab03-01-schema-and-migration`  
**Status:** ✅ Merged

Expand the PostgreSQL Prisma schema and seed script to support real users, authentication, roles, ticket ownership, comments, notes, and status workflow.

**Scope:**
- Prisma Schema Updates (`server/prisma/schema.prisma`):
  - `Role` Enum: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`
  - `User` model: `id`, `email` (unique), `passwordHash`, `name`, `role`, `isActive`, `mustChangePassword`, timestamps
  - `Ticket` model additions: `assignedToId` (User relation), `itPriority`, `isRequesterResolved`, timestamps
  - `PublicComment` & `InternalNote` models
- Idempotent Seed Script (`prisma/seed.ts`):
  - Seed users, requesters, categories, related systems, tickets, comments, and notes.

---

### F-02 · Authentication Backend & Auth Middleware
**Prerequisites:** F-01  
**Branch:** `feature/lab03-02-auth-backend`  
**Status:** ✅ Merged

Implement backend session management, credential validation, password hashing, and authentication API endpoints.

**Scope:**
- Password Hashing: `bcryptjs` with salt rounds >= 10.
- Auth Middleware & Session: HttpOnly session cookie via `express-session`, `requireAuth`, `requireRole`, `requireFirstLoginCompleted`.
- Authentication Endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`.
- API Integration Tests (`server/tests/lab-03/auth.api.test.ts`).

---

### F-03 · Server-Side Authorization & Requester Refactoring
**Prerequisites:** F-02  
**Branch:** `feature/lab03-03-authorization-and-requester-refactor`  
**Status:** ✅ Merged

Refactor Requester endpoints to use session identity and enforce server-side data isolation.

**Scope:**
- Bind all Requester queries to `req.session.user.id`.
- Scoping guards for `/api/tickets`, `/api/tickets/:id`, and attachments.
- Requester Resolution Request Backend (`PATCH /api/tickets/:id/resolve-indication`).
- API Integration Tests (`server/tests/lab-03/authorization.api.test.ts`).

---

### F-04 · IT Staff Ticket Queue & Workflow Backend
**Prerequisites:** F-02, F-03  
**Branch:** `feature/lab03-04-staff-queue-and-workflow-backend`  
**Status:** ✅ Merged

Implement IT Staff Ticket Queue API, ticket assignment, priority updates, status state machine workflow, and comments/notes endpoints.

**Scope:**
- Staff Queue Query (`GET /api/tickets/staff-queue`): Keyword search, status/priority/assignment filters, sorting, pagination.
- Ownership & Workflow Endpoints: `PATCH /api/tickets/:id/claim`, `PATCH /api/tickets/:id/assign`, `PATCH /api/tickets/:id/priority`, `PATCH /api/tickets/:id/status`.
- Public Comments & Confidential Internal Notes APIs (`/api/tickets/:id/comments`, `/api/tickets/:id/notes`).
- API Integration Tests (`staff-queue.api.test.ts`, `staff-ticket-detail.api.test.ts`, `comments-notes.api.test.ts`).

---

### F-05 · Authentication & Password Change UI
**Prerequisites:** F-02, F-03  
**Branch:** `feature/lab03-05-auth-ui`  
**Status:** ✅ Merged

Implement frontend Login form, Mandatory Password Change modal, and updated AppShell with user context.

**Scope:**
- Login Form (`LoginForm.tsx`): Email/Password input, error alert banner.
- Mandatory Password Change Modal (`ChangePasswordModal.tsx`): Non-dismissible overlay when `mustChangePassword = true`, password complexity checklist.
- AppShell Update: Display active user badge (`Name (Role)`), sign out button.

---

### F-06 · Requester Resolution Indication UI & Status Display Updates
**Prerequisites:** F-03, F-05  
**Branch:** `feature/lab03-06-requester-resolution-ui`  
**Status:** 📤 Pushed

Build the Requester resolution indication UI button, confirmation modal, and status badge updates.

**Scope:**
- Action Button & Modal (`TicketDetailPage.tsx`): "I consider this issue resolved" button (`data-testid="request-resolution-button"`), confirmation modal (`data-testid="resolution-confirmation-modal"`).
- Disabled State: Displays "Resolution Requested ✓" badge (`data-testid="resolution-requested-badge"`).
- Status Badges: Displays yellow `Pending Verification` status badge on detail view and `/tickets` list.
- Post-Auth Navigation Fixes: Redirects authenticated users away from root `/` selector to `/tickets` or `/staff/queue`.

---

### F-07 · IT Staff Ticket Queue & Filter Bar UI
**Prerequisites:** F-04, F-05  
**Branch:** `feature/lab03-07-staff-queue-ui`  
**Status:** ⏳ Up Next

Build the dedicated IT Staff Ticket Queue page (`/staff/queue`).

**Scope:**
- Search bar (keyword matching ticket number, summary, description).
- Filter bar: Status dropdown, IT Priority dropdown, Assignment filter (`All`, `Unassigned`, `Assigned to Me`).
- Table view with status/priority badges, requester name, assignee name, submission timestamp.
- Sorting headers (Ticket #, Priority, Status, Date) and pagination controls.

---

### F-08 · IT Staff Ticket Detail Management & Activity Feed UI
**Prerequisites:** F-04, F-05, F-07  
**Branch:** `feature/lab03-08-staff-ticket-detail-ui`  
**Status:** 📅 Planned

Build the IT Staff management controls and activity feed on ticket detail view.

**Scope:**
- Sidebar Management Controls: Claim button, Reassign dropdown, IT Priority selector, Status transition dropdown.
- `Pending Verification` Resolution Controls: Staff "Confirm Resolution" (closes ticket) and "Revert to In Progress" (resets `isRequesterResolved = false`).
- Tabbed Activity Feed: Public Comments feed + Confidential Internal Notes feed (yellow tinted container).

---

### F-09 · Administrator User Management Backend & UI
**Prerequisites:** F-02, F-05  
**Branch:** `feature/lab03-09-admin-users`  
**Status:** 📅 Planned

Build Administrator user management backend endpoints and administration screen.

**Scope:**
- Admin Endpoints (`/api/users`): Restricted to `ADMINISTRATOR` role.
  - `GET /api/users`: Search (name/email), role filter.
  - `POST /api/users`: Create user account (duplicate email 409 check).
  - `PATCH /api/users/:id`: Edit user details, role, `isActive` status (Admin self-deactivation and last-admin guards).
  - `POST /api/users/:id/reset-password`: Reset initial password, setting `mustChangePassword = true`.
- User Administration Page (`/admin/users`): User list table, search, filters, Create User modal, Edit User modal, Reset Password modal.

---

### F-10 · Playwright E2E Testing, Visual Audits & Definition of Done Verification
**Prerequisites:** F-07, F-08, F-09  
**Branch:** `feature/lab03-10-e2e-and-docs`  
**Status:** 📅 Planned

Implement E2E test suites, perform responsive design visual audits, and finalize lab documentation.

**Scope:**
- Playwright E2E Test Suites (`e2e/lab-03/`): Authentication flow, staff queue & ticket workflow, admin user administration.
- Visual Audit Screenshots: Desktop, tablet, mobile viewports.
- Documentation: Finalize `docs/lab-03/reviewer.md` and `docs/lab-03/ai-use.md`.