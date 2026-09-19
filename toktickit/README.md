# TokTickIT — Internal IT Ticketing System (Lab 03 Implementation)

TokTickIT is an internal IT support ticketing application built with **React** (TypeScript, Vite, Vanilla CSS), **Express** (Node.js REST API), **Prisma ORM**, and **PostgreSQL**.

---

## Key Features (Lab 03)

- **Authentication & Security**: Email/password authentication, non-dismissible mandatory first-login password change with real-time complexity validation, and session-based auth.
- **Role-Based Access Control (RBAC)**: Enforced authorization across 3 roles: `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR`.
- **IT Staff Queue & Ticket Management**: Real-time searching, status/priority filtering, pagination, one-click ticket claiming, ownership reassignment, and IT Priority customization.
- **Activity & Communication Feed**: Public Comments feed (visible to requesters and staff) and Confidential Internal Notes feed (strictly restricted to IT Staff and Admins).
- **Requester Resolution Indication**: Allows ticket owners to request resolution, updating ticket status to `Pending Verification` with IT Staff confirmation/revert actions.
- **Administrator User Management**: Minimalist admin user panel (`/admin/users`) with search, role filtering, user creation, account editing, password reset, self-deactivation prevention, and last-admin safety rules.
- **Zen Green Design System**: Mobile-first responsive UI built with custom CSS variables (`--color-primary-green: #005A36`).

---

## Demo Login Credentials

For testing and grading, use the following seeded accounts:

| Role | Email | Initial Password | Notes / Permissions |
|---|---|---|---|
| **Requester** | `requester1@toktickit.local` | `Password123!` | Triggers mandatory password change on 1st login |
| **IT Staff** | `staff1@toktickit.local` | `Password123!` | Access to Staff Queue, Claim, Assignee & IT Controls |
| **Administrator** | `admin@toktickit.local` | `AdminPassword123!` | Full access including User Management (`/admin/users`) |

---

## Setup Instructions

### 1. Install Dependencies
Install dependencies for root (E2E testing), frontend (`client`), and backend (`server`):
```bash
# Root dependencies (Playwright E2E)
npm install
npx playwright install chromium

# Frontend client
cd client
npm install

# Backend server
cd ../server
npm install
```

### 2. Environment Variables
In the `server/` directory, copy `.env.example` to `.env`:
```bash
cd server
cp .env.example .env
```
Ensure `DATABASE_URL` in `.env` points to your active PostgreSQL instance.

### 3. Database Migration & Seeding
Push the Prisma schema to PostgreSQL and seed initial reference data (Users, Categories, Related Systems, and Sample Tickets):
```bash
cd server
npx prisma db push
npm run prisma:seed
```

---

## Running the Application

Start the backend API and frontend client development servers:

**Backend API (`http://localhost:3000`):**
```bash
cd server
npm run dev
```

**Frontend Client (`http://localhost:5173`):**
```bash
cd client
npm run dev
```

---

## Testing & Quality Assurance

The application features 100% passing test coverage across Unit, API/Integration, UI Component, and End-to-End (E2E) levels:

- **Server Unit & Authorization API Tests (54 tests across 7 suites):**
  ```bash
  cd server
  npx vitest run tests/lab-03
  ```

- **Client React Component Tests (22 tests across 5 suites):**
  ```bash
  cd client
  npx vitest run tests/lab-03
  ```

- **Playwright End-to-End (E2E) Tests (10 tests across 3 suites):**
  *Make sure both client (`http://localhost:5173`) and server (`http://localhost:3000`) are running.*
  ```bash
  # Run Lab 03 E2E tests headlessly
  npx playwright test e2e/lab-03

  # Run all E2E tests with UI dashboard
  npm run test:e2e:ui
  ```

---