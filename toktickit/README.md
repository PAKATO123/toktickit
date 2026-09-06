# TokTickIT — Internal IT Ticketing System (Lab 02 Implementation)

TokTickIT is an internal IT support ticketing application built with **React** (TypeScript, Vite, Vanilla CSS), **Express** (Node.js REST API), **Prisma ORM**, and **PostgreSQL**.

---

## Setup Instructions

### 1. Install Dependencies
Install dependencies for root (E2E testing), frontend (`client`), and backend (`server`):
```bash
# Root dependencies (Playwright)
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
Push the Prisma schema to PostgreSQL and seed initial reference data (Development Requesters, Categories, Related Systems):
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

## Testing

The project is thoroughly tested across Unit, Integration/API, UI Component, and End-to-End (E2E) levels.

- **Backend Integration Tests (42 tests across 8 suites):**
  ```bash
  cd server
  npm run test
  ```

- **Frontend Component Tests (28 tests across 7 suites):**
  ```bash
  cd client
  npm run test
  ```

- **End-to-End (E2E) Browser Tests (Playwright):**
  *Make sure both client (`http://localhost:5173`) and server (`http://localhost:3000`) are running.*
  ```bash
  # Run all E2E tests headlessly
  npm run test:e2e

  # Run E2E tests with visual browser (headed)
  npm run test:e2e:headed

  # Open interactive Playwright UI dashboard
  npm run test:e2e:ui
  ```