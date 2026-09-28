# TokTickIT — UI Specification (Lab 4)
Actions Taken, Operational Dashboards, and Zen Green Application Polish

---

## 1. Design System Tokens & Foundations (Zen Green Extension)

Lab 4 maintains strict design continuity with the **Zen Green** theme established in Lab 2 and extended in Lab 3.

### Color Palette Tokens
- **Primary Brand / Action**: `#15803D` (Emerald-700 / Zen Primary Green)
- **Primary Hover / Active**: `#166534` (Emerald-800)
- **Primary Light / Accent Canvas**: `#F0FDF4` (Emerald-50)
- **Primary Border / Divider**: `#DCFCE7` (Emerald-100) / `#BBF7D0` (Emerald-200)
- **Secondary Neutral**: `#475569` (Slate-600)
- **Dark Text / Surface**: `#0F172A` (Slate-900)
- **Card Background**: `#FFFFFF`
- **Page Canvas**: `#F8FAFC` (Slate-50)

### Dashboard Metric & Status Badge Tokens
- **Metric Cards**:
  - `Total / General`: Emerald Accent (`bg-emerald-50 text-emerald-800 border-emerald-200`)
  - `Unassigned / Attention`: Amber Accent (`bg-amber-50 text-amber-800 border-amber-200`)
  - `Urgent / High Priority`: Crimson Accent (`bg-rose-50 text-rose-800 border-rose-200`)
  - `Follow-Up Needed`: Indigo Accent (`bg-indigo-50 text-indigo-800 border-indigo-200`)
  - `Resolved / Closed`: Teal Accent (`bg-teal-50 text-teal-800 border-teal-200`)
- **Action Taken Badges**:
  - `Follow-Up Required`: Amber pill badge (`bg-amber-100 text-amber-800 font-semibold`)
  - `No Follow-Up`: Slate pill badge (`bg-slate-100 text-slate-600`)

---

## 2. Navigation Shell & URL Routing Architecture (`/requester/xxx`, `/staff/xxx`, `/admin/xxx`)

The top navigation app bar (`AppShell`) provides uniform role-based route namespaces and active tab indicators:

- **Requester View**: `Dashboard` (`/requester/dashboard`) | `My Tickets` (`/requester/tickets`) | `Create Ticket` (`/requester/tickets/new`)
- **IT Staff View**: `Dashboard` (`/staff/dashboard`) | `Ticket Queue` (`/staff/queue`) | `My Assigned Tickets` (`/staff/queue?assignment=me`)
- **Administrator View**: `Dashboard` (`/admin/dashboard`) | `User Management` (`/admin/users`) | `Ticket Queue` (`/staff/queue`)

---

## 3. Screen Specifications

### Screen 1: IT Staff Dashboard (`/staff/dashboard`)
- **Header**: Greeting banner ("Welcome back, [Staff Name]!") + live refresh button + date indicator.
- **Metric Summary Grid (4 Top Cards)**:
  1. `Unassigned Tickets`: Number of unassigned active tickets. Click navigates to `/staff/queue?assignment=unassigned`.
  2. `My Owned Tickets`: Number of tickets assigned to authenticated staff user. Click navigates to `/staff/queue?assignment=me`.
  3. `Urgent & High Priority`: Count of active urgent/high tickets. Click navigates to `/staff/queue?priority=high_urgent`.
  4. `Follow-Up Required`: Count of tickets with pending action follow-ups. Click navigates to `/staff/queue?followUp=true`.
- **Status Distribution Card**: Grid/bar visualization showing count breakdown by ticket status (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`).
- **Recent Activity Feed**: List of recently updated tickets and recently added Actions Taken with direct ticket link pills.
- **Empty & Error States**: Clean Zen Green empty state placeholders when metrics equal zero.

### Screen 2: Requester Dashboard (`/requester/dashboard`)
- **Header**: Personal greeting ("Welcome back, [Requester Name]!") + quick create shortcut button.
- **Metric Summary Grid (4 Top Cards)**:
  1. `Total Open Tickets`: Count of open tickets owned by user. Click navigates to `/requester/tickets?filter=open`.
  2. `Waiting for You`: Count of tickets in `Waiting for Requester` status. Click navigates to `/requester/tickets?status=WAITING_FOR_REQUESTER`.
  3. `Recently Updated`: Top 5 tickets updated recently.
  4. `Recently Resolved`: Top 5 tickets resolved recently. Click navigates to `/requester/tickets?filter=resolved`.
- **Quick Action Row**: Prominent primary button `+ Create New Ticket` (`/requester/tickets/new`) and `View All My Tickets` (`/requester/tickets`).

### Screen 3: Actions Taken Component on Ticket Detail View
- **Location**: Rendered within the Ticket Detail screen (`/requester/tickets/:id` for Requesters; `/staff/tickets/:id` for Staff/Admins).
- **Header Toolbar**: Title "Actions Taken", item counter badge (e.g. `[3 Actions]`), and "+ Add Action Taken" button (IT Staff/Admin only).
- **Actions Taken Table / Card List**:
  - Columns / Fields:
    1. `Action Date`: Formatted timestamp (e.g., `Sep 28, 2026, 14:30`).
    2. `Description`: Full text of action performed.
    3. `Result`: Outcome text.
    4. `Performed By`: Staff member name badge.
    5. `Follow-Up`: Pill badge (`Follow-Up Required` vs `No Follow-Up`).
    6. `Follow-up Note`: Displayed when follow-up is required.
    7. `Attachment Notes`: Displayed when file/image references are noted.
    8. `Actions`: "Edit" button (IT Staff/Admin).
- **Add / Edit Action Taken Drawer/Modal**:
  - `Action Date/Time` input (defaults to current time).
  - `Action Description` textarea (Required).
  - `Result` textarea (Required).
  - `Follow-Up Required` checkbox toggle.
  - `Follow-Up Note` textarea (Required when checkbox checked; live inline validation).
  - `Attachment Notes` text input.
  - Buttons: `Save Action Taken` (Primary Zen Green) and `Cancel`.
- **Requester Mode**: Displays complete list of Actions Taken in clean read-only cards without Add/Edit buttons.

### Screen 4: Administrator Dashboard (`/admin/dashboard`)
- **Header**: Welcome banner + Quick switch links.
- **Upper Grid**: IT Staff operational metric cards.
- **Lower Grid**: User Account Summary card showing `Total Accounts`, `Requesters`, `IT Staff`, `Administrators`, and `Inactive Accounts` with direct link to `/admin/users`.

---

## 4. Responsive & Accessibility Specifications

- **Responsive Breakpoints**:
  - Mobile (375px - 639px): Single column metric stack, scrollable table view or card stack for Actions Taken.
  - Tablet (640px - 1023px): 2x2 metric card grid.
  - Desktop (1024px+): 4-card header layout, side-by-side status breakdown and activity feed.
- **Accessibility**:
  - All interactive cards, modal buttons, and drawer inputs have distinct visible focus rings (`ring-2 ring-emerald-600`).
  - Metric numbers accompanied by textual ARIA labels (e.g. `aria-label="5 unassigned tickets needing attention"`).
  - Color contrast ratio >= 4.5:1 on all text labels.
