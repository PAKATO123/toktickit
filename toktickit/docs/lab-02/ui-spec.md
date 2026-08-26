# TokTickIT - UI Specification (Lab 2)
## Requester Ticketing MVP with Zen Green UI Foundation

---

## 1. Design System & Tokens

The application strictly adheres to the **Zen Green** visual design system.

### Color Tokens

| Token | Hex / Value | Usage & Application |
|---|---|---|
| **Primary Green** | `#006B3C` | App header, primary action buttons, active navigation markers, key brand emphasis |
| **Secondary Green** | `#0B7A46` | Secondary buttons, active tab indicators, focus accents, interactive links, hover states |
| **Pale Green** | `#EAF6EF` | Selected rows/cards, subtle callout backgrounds, success toasts, status badges |
| **Page Background** | `#F5F7F6` | Main application canvas / body background |
| **Surface / Card** | `#FFFFFF` | Form containers, modal dialogs, data table cards, detail panels |
| **Border Neutral** | `#E2E8F0` | Card borders, table dividers, default input borders |
| **Text Primary** | `#1A2E22` | Dark charcoal-green for headings and primary content |
| **Text Secondary** | `#4A5568` | Secondary labels, table column headers, helper text, timestamps |
| **Error / Red** | `#C53030` | Error banners, input validation error borders, destructive actions |
| **Warning / Amber** | `#D69E2E` | Warning alerts, confirmation dialog highlights, high-priority badges |
| **Coral / Urgent** | `#E53E3E` | Urgent priority badge background / text |
| **Info / Blue** | `#3182CE` | Informational callouts and tooltips |

### Typography & Spacing
- **Font Family**: Inter, Roboto, or modern system sans-serif (`system-ui, -apple-system, sans-serif`).
- **Headings**: `h1` (24px, bold), `h2` (20px, semibold), `h3` (16px, semibold) in `Text Primary`.
- **Body & Inputs**: 14px regular; Helper & Caption: 12px regular.
- **Spacing Scale**: 8px increments (`8px`, `16px`, `24px`, `32px`, `48px`).
- **Border Radius**: `6px` for form controls/badges, `8px` for cards/panels, `12px` for modals.

---

## 2. Global Layout & Shell

### Top Navigation Bar
- **Brand Logo & Title**: "TokTickIT" with Zen Green styling.
- **Navigation Links**:
  - `My Tickets` (leads to ticket list)
  - `+ Create Ticket` (leads to new ticket form)
- **Development Requester Selector**:
  - Positioned at top right of the navigation shell.
  - Dropdown populated with active Development Requesters from seed data.
  - Displays avatar/icon and name of the currently active Requester.
  - Selecting a different requester triggers context switch handling (see Section 3).

---

## 3. Ambiguity Clarifications & Resolved Interaction Rules

### 3.1. Cold Start & Requester Selection UX (`FR-01`, `BR-04`, `BR-08`)
- **Initial Cold-Start Prompt**:
  - When no requester is selected on initial launch, the main viewport displays a prominent **Empty State Card**:
    - Title: *"Select a Development Requester"*
    - Description: *"Please select an active Development Requester from the header dropdown to view your tickets or create a new request."*
    - Visual icon and callout pointing to the requester selector.
- **Requester Switch Protection (Dirty Form Warning)**:
  - If the user switches the active requester while editing an unsaved ticket creation form, the UI displays a **Confirmation Modal**:
    - Message: *"Switching requester will discard your unsaved ticket draft. Do you want to continue?"*
    - Actions: `Cancel` (reverts selector) | `Discard & Switch` (abandons draft and switches context).

### 3.2. Post-Creation Navigation & Success Feedback (`FR-13`)
- **Submission Action**:
  - Upon successful ticket submission, the system **redirects immediately to the Ticket Detail view** (`/tickets/:id` or `/tickets/:ticketNumber`).
  - A floating **Zen Green Success Toast** appears at the top-right corner:
    - *"Ticket #<TICKET_NUMBER> created successfully."*
    - Auto-dismisses after 5 seconds or on close click.

### 3.3. Attachment Management & Upload Lifecycle (`FR-25` - `FR-30`, `BR-26` - `BR-30`)
- **Limits & Real-Time Feedback**:
  - Staged file list shows a live attachment counter: `Attachments (X / 5)`.
  - Client-side validation runs immediately upon file selection:
    - Rejects files exceeding **5 MB**.
    - Rejects disallowed file formats (only `JPG/JPEG`, `PNG`, `WEBP`, `PDF` allowed).
    - Prevents attaching more than **5 files** total.
    - Displays an inline red error message explaining any rejected file.
- **Soft-Removal Confirmation**:
  - When a user clicks the remove/delete icon for an attachment on the Ticket Detail view, a **Confirmation Modal** is required:
    - Message: *"Are you sure you want to remove attachment '<filename>'? This action cannot be undone."*
    - Actions: `Cancel` | `Remove Attachment`.

### 3.4. Search, Filter, & Table Header Sorting Interaction (`FR-17` - `FR-20`, `BR-23`, `BR-24`)
- **Interactive Clickable Table Headers**:
  - Sortable column headers (`Requested Priority`, `Current Status`) are clickable buttons with sort indicator icons (`↕`, `▲`, `▼`).
  - **3-State Cycling**: Clicking a header cycles through:
    1. `Not Applied` (default)
    2. `Sorted (Ascending / Ranked)` (header background darkens with active indicator)
    3. `Reverse Sorted (Descending / Reverse Ranked)`
    4. `Not Applied` (returns to default)
  - **Single Column Precedence**: Clicking a different sortable column immediately resets the previous active column sort back to `Not Applied`.
  - **Multi-Level Cascade**:
    - When sorting by Priority: Primary = `Priority`, Secondary = `Status`, Tertiary = `Ticket Number`.
    - When sorting by Status: Primary = `Status`, Secondary = `Priority`, Tertiary = `Ticket Number`.
- **Search & Filter Flow**:
  - Keyword search input filters dynamically across Ticket Number, Summary, and Description.
  - Dropdown filters for `Current Status`, `Requested Priority`, `Category`, and `Related System`.
  - Applying any filter or search query automatically resets pagination to **Page 1**.

### 3.5. Rate Limiting (HTTP 429) & Form Validation Constraints (`BR-12`, `BR-18`, `BR-19`)
- **Submit Cooldown**:
  - Upon submitting a ticket, the "Submit Ticket" button immediately enters a **Disabled State with a 15-Second Cooldown** (showing a countdown or spinner).
  - If a duplicate submission request reaches the backend within the 15-second window resulting in an HTTP `429 Too Many Requests`, an error alert banner is displayed: *"You are submitting tickets too quickly. Please wait a few moments and try again."*
- **Minimum Description Length Validation (BR-12)**:
  - Description must be at least 20 characters.
  - On submit (or when blurred with insufficient length), the textarea border turns **Red (`#C53030`)** and displays small red helper text: *"Description must be at least 20 characters."*

### 3.6. Zen Green Badges & Status Indicators
- **Status Badges**:
  - `New`: Pale green background (`#EAF6EF`), Dark green text (`#006B3C`), Green border (`#A3D9BC`).
- **Priority Badges**:
  - `Urgent`: Pale red background (`#FFF5F5`), Dark red text (`#C53030`), Red border.
  - `High`: Amber/orange background (`#FFFAF0`), Dark amber text (`#DD6B20`), Amber border.
  - `Medium`: Soft blue/yellow background (`#EBF8FF`), Navy/slate text (`#2B6CB0`).
  - `Low`: Neutral light gray (`#EDF2F7`), Dark gray text (`#4A5568`).
  - `None / Optional`: Muted slate italic text or neutral tag.

---

## 4. Screen Specifications

### 4.1. Screen 1: My Tickets View (`/tickets`)
1. **Header & Context Bar**:
   - Page title: *"My Tickets"*.
   - Action button: `+ Create Ticket` (Primary Green).
2. **Search & Filter Panel**:
   - Keyword search bar with search icon.
   - Filter dropdowns: Category, Related System, Status, Priority.
   - `Clear Filters` button (visible when filters are active).
3. **Tickets Data Table**:
   - Columns: `Ticket Number`, `Summary`, `Category`, `Related System`, `Priority` (Sortable), `Status` (Sortable), `Created Date`.
   - Hover state on rows with pointer cursor to open Ticket Detail.
   - Active sorted header darkened with sort arrow.
4. **Pagination Bar**:
   - Showing `X - Y of Z tickets`.
   - Page size selector: `10`, `25`, `50` per page.
   - Previous / Next navigation buttons.
5. **View States**:
   - **No Requester Selected**: Empty state card prompting requester selection.
   - **Loading State**: Zen Green skeleton rows or spinner.
   - **Empty List State**: *"You haven't submitted any tickets yet. Click '+ Create Ticket' to get started."*
   - **No Results State**: *"No tickets matched your search criteria. Try clearing your filters."* with `Clear Filters` button.

### 4.2. Screen 2: Create Ticket View (`/tickets/new`)
1. **Form Fields**:
   - **Category** `*`: Dropdown populated from reference data.
   - **Related System** `*`: Dropdown populated from reference data.
   - **Summary (Title)** `*`: Text input (max 255 chars).
   - **Description** `*`: Multi-line textarea (min 20 chars). Displays red border + error text if invalid on submit.
   - **Requested Priority** (Optional): Dropdown (`Urgent`, `High`, `Medium`, `Low`, `None`).
2. **Attachment Staging Area**:
   - Drag-and-drop zone with file picker button.
   - Live counter: `Attachments (X / 5)`.
   - List of staged files with file name, file size (MB), and a remove icon (`✕`).
   - Inline error display for invalid file types or oversized files (> 5MB).
3. **Form Actions**:
   - `Cancel` button (navigates back to My Tickets).
   - `Submit Ticket` button (Primary Green, enters 15s disabled state after submit).

### 4.3. Screen 3: Ticket Detail View (`/tickets/:id`)
1. **Header Area**:
   - Ticket Number (e.g. `TICK-2026-0001`) with Status Badge (`New`) and Priority Badge.
   - `← Back to My Tickets` link.
2. **Ticket Information (Read-Only)**:
   - Summary, Category, Related System, Created At timestamp, Requester Name.
   - Full Description formatted with preserved line breaks.
3. **Attachment Section**:
   - Section title: `Attachments (X / 5 active)`.
   - List of active attachments showing:
     - File icon (image / PDF icon).
     - File name, file size (formatted KB/MB), upload date.
     - `Download` button (Primary/Secondary Green).
     - `Delete / Remove` button (soft-delete, opens confirmation modal).
   - `+ Add Attachment` button (disabled if 5 active attachments exist).
4. **Access Control (403 Forbidden State)**:
   - If attempting to view a ticket belonging to another requester, render a dedicated **403 Forbidden Card**: *"Access Denied: You do not have permission to view this ticket."* with a button to return to My Tickets.

---

## 5. Responsive & Accessibility Standards
- **Breakpoints**: Desktop (`>= 1024px`), Tablet (`768px - 1023px`), Mobile (`< 768px`).
- **Mobile Adaptations**:
  - Data table collapses into structured card view per ticket.
  - Filter panel stacks vertically or collapses into a drawer.
- **Accessibility**:
  - All form controls have associated `<label>` elements.
  - Visible Zen Green focus outlines (`#0B7A46`) on all interactive inputs and buttons.
  - Full keyboard navigability (Tab order, Enter to trigger buttons, Esc to close modals).
  - ARIA live regions for success toasts and error banners.