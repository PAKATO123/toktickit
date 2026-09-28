# Lab 3 Specification Decisions & Clarifications Sheet

This document highlights the key design decisions, default choices, and optional configuration points for Lab 3. Please review the defaults below. If you wish to adjust any of these choices before implementation begins, you can specify your preferences.

---

## 1. Decisions Answered with Standard Baseline Defaults (Extremely Obvious / Standard Choices)

### 1.1 Password Hashing & Password Complexity
- **Choice**: `bcryptjs` with 10 salt rounds.
- **Rule**: Password must be at least 8 characters, containing >= 1 uppercase letter, >= 1 lowercase letter, and >= 1 numerical digit.
- **Initial Passwords for Seed Users**:
  - Requesters & IT Staff: `Password123!` (with `mustChangePassword = true` on initial login)
  - Administrator: `AdminPassword123!` (with `mustChangePassword = false` for instant testing, or `true` if tested)

### 1.2 Data Migration from Lab 2
- **Choice**: Existing Lab 2 `Requester` entries are migrated into the new `User` model with `role = REQUESTER`.
- **Foreign Key Binding**: `Ticket.requesterId` maps directly to `User.id`. `Ticket.assignedToId` is added as an optional foreign key referencing `User.id` for IT Staff assignment.

### 1.3 Permitted Ticket Status Transition State Machine
- **State Flow**:
  - `New` ➔ `Open`, `In Progress`, `Cancelled`
  - `Open` ➔ `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled`
  - `In Progress` ➔ `Waiting for Requester`, `Resolved`, `Cancelled`
  - `Waiting for Requester` ➔ `In Progress`, `Resolved`, `Cancelled`
  - `Resolved` ➔ `Closed`, `Reopened`
  - `Closed` ➔ `Reopened`
  - `Reopened` ➔ `In Progress`, `Resolved`, `Cancelled`
  - `Cancelled` ➔ Terminal (no further transitions)

### 1.4 Comments & Notes Visibility
- **Public Comments**: Append-only; visible to Ticket Owner (Requester), IT Staff, and Administrators.
- **Internal Notes**: Append-only; visible ONLY to IT Staff and Administrators. Attempts by Requesters to fetch or post internal notes return `403 Forbidden`.

### 1.5 Administrator Safety Rules
- Admin cannot deactivate their own active account (`isActive = false` rejected).
- Deactivating or changing the role of the last active Administrator is strictly blocked.
- Account deactivation is used; hard deletion of user records is prohibited.

---

## 2. Options for User Review / Confirmation

Please confirm if you are happy with these default choices or if you prefer an alternative:

1. **Authentication Session Storage**:
   - **Default (Recommended)**: Cookie-based HTTP-only session token (`express-session` or signed session cookie).
   - **Alternative**: JWT stored in HTTP-only cookie.
2. **Administrator Navigation Access**:
   - **Default (Recommended)**: Administrators have access to User Management in the nav bar, but also have access to the Ticket Queue tab if they need to view/manage tickets.
   - **Alternative**: Administrators are strictly restricted to the User Management screen only.
3. **Requester Resolution Indication UI & Status Workflow**:
   - **User-Friendly Indicator**: When a user marks a problem as resolved, display a clean, user-friendly badge: `"Pending Resolution Verification"` (or `"User Marked Resolved"`).
   - **Confirmation Popup**: When the Requester clicks "Mark as Resolved", a confirmation dialog pops up asking: *"Are you sure you want to mark this problem as resolved?"* with "Confirm" and "Cancel" buttons.
   - **Disabled Button State**: Once confirmed, the request is sent, and the button becomes disabled/greyed out showing `"Resolution Requested ✓"` to clearly indicate it has already been submitted.
   - **Unique Status (`Pending Verification`)**: The ticket status transitions to `Pending Verification` (or `Resolved (Pending Review)`).
   - **IT Staff Revert Option**: IT Staff viewing the ticket can either formally confirm and transition status to `Resolved` / `Closed`, or revert the process back to `In Progress` (or `Open`) if they deem the problem is not fully solved, resetting the resolution request state.
