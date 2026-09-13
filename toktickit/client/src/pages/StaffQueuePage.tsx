import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getStaffQueue,
  getCategories,
  getRelatedSystems,
  StaffQueueTicketItem,
  Category,
  RelatedSystem,
} from "../api";

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const StaffQueuePage: React.FC = () => {
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);

  // List State
  const [tickets, setTickets] = useState<StaffQueueTicketItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter Controls
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [systemFilter, setSystemFilter] = useState<string>("");

  // Sort & Pagination Controls
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<string>("desc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Load Categories & Related Systems on mount for filters
  useEffect(() => {
    let isMounted = true;
    async function loadReferenceData() {
      try {
        const [cats, syss] = await Promise.all([getCategories(), getRelatedSystems()]);
        if (isMounted) {
          setCategories(cats);
          setRelatedSystems(syss);
        }
      } catch (err) {
        console.error("Error loading reference data for filters:", err);
      }
    }
    loadReferenceData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce search input (~300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch IT Staff Queue from API
  const fetchQueue = useCallback(async () => {
    if (!user || (user.role !== "IT_STAFF" && user.role !== "ADMINISTRATOR")) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getStaffQueue({
        search: debouncedSearch,
        status: statusFilter,
        itPriority: priorityFilter,
        assignment: assignmentFilter,
        categoryId: categoryFilter,
        relatedSystemId: systemFilter,
        sortBy,
        sortDirection,
        page,
        pageSize,
      });

      setTickets(res.data || []);
      setPagination(res.pagination || null);
    } catch (err: any) {
      console.error("Error loading staff queue:", err);
      setError(err.message || "Unable to load IT staff queue right now.");
    } finally {
      setLoading(false);
    }
  }, [
    user,
    debouncedSearch,
    statusFilter,
    priorityFilter,
    assignmentFilter,
    categoryFilter,
    systemFilter,
    sortBy,
    sortDirection,
    page,
    pageSize,
  ]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Sort Toggle Handler
  const handleSort = (field: string) => {
    setPage(1);
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("desc");
    }
  };

  const renderStatusBadge = (status: string, isRequesterResolved?: boolean) => {
    const lower = status.toLowerCase();
    if (isRequesterResolved || lower === "pending verification") {
      return (
        <span
          className="tt-badge"
          data-testid="status-badge"
          style={{ backgroundColor: "#FEFCBF", color: "#744210", border: "1px solid #D69E2E", fontWeight: 600 }}
        >
          Pending Verification
        </span>
      );
    }
    if (lower === "new") return <span className="tt-badge tt-badge-new" data-testid="status-badge">New</span>;
    if (lower === "open")
      return (
        <span
          className="tt-badge"
          data-testid="status-badge"
          style={{ backgroundColor: "#EBF8FF", color: "#2B6CB0", border: "1px solid #63B3ED" }}
        >
          Open
        </span>
      );
    if (lower === "in progress")
      return (
        <span className="tt-badge tt-badge-medium" data-testid="status-badge">
          In Progress
        </span>
      );
    if (lower === "waiting for requester")
      return (
        <span
          className="tt-badge"
          data-testid="status-badge"
          style={{ backgroundColor: "#FEFCBF", color: "#744210", border: "1px solid #D69E2E" }}
        >
          Waiting for Requester
        </span>
      );
    if (lower === "reopened")
      return (
        <span
          className="tt-badge"
          data-testid="status-badge"
          style={{ backgroundColor: "#FEE2E2", color: "#991B1B", border: "1px solid #F87171" }}
        >
          Reopened
        </span>
      );
    if (lower === "resolved")
      return (
        <span
          className="tt-badge"
          data-testid="status-badge"
          style={{ backgroundColor: "#E6FFFA", color: "#234E52", border: "1px solid #319795" }}
        >
          Resolved
        </span>
      );
    if (lower === "closed")
      return (
        <span
          className="tt-badge"
          data-testid="status-badge"
          style={{ backgroundColor: "#EDF2F7", color: "#4A5568", border: "1px solid #CBD5E0" }}
        >
          Closed
        </span>
      );
    if (lower === "cancelled")
      return (
        <span
          className="tt-badge"
          data-testid="status-badge"
          style={{ backgroundColor: "#E2E8F0", color: "#718096", border: "1px solid #A0AEC0" }}
        >
          Cancelled
        </span>
      );
    return <span className="tt-badge" data-testid="status-badge">{status}</span>;
  };

  const renderPriorityBadge = (priority: string | null) => {
    if (!priority) {
      return (
        <span className="tt-badge" data-testid="priority-badge" style={{ backgroundColor: "#EDF2F7", color: "#718096" }}>
          Unassigned
        </span>
      );
    }
    const up = priority.toUpperCase();
    if (up === "URGENT") return <span className="tt-badge tt-badge-urgent" data-testid="priority-badge">Urgent</span>;
    if (up === "HIGH") return <span className="tt-badge tt-badge-high" data-testid="priority-badge">High</span>;
    if (up === "MEDIUM") return <span className="tt-badge tt-badge-medium" data-testid="priority-badge">Medium</span>;
    if (up === "LOW") return <span className="tt-badge tt-badge-low" data-testid="priority-badge">Low</span>;
    return <span className="tt-badge" data-testid="priority-badge">{priority}</span>;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // RBAC Check for non-staff / non-admin
  if (user && user.role !== "IT_STAFF" && user.role !== "ADMINISTRATOR") {
    return (
      <div className="tt-card tt-empty-state" style={{ backgroundColor: "var(--color-error-bg)", borderColor: "var(--color-error)", margin: "40px auto", maxWidth: "600px" }}>
        <h2 style={{ color: "var(--color-error)", marginBottom: "8px" }}>403 Access Denied</h2>
        <p style={{ color: "var(--color-text-main)", marginBottom: "20px" }}>
          The IT Staff Queue is restricted to IT Support Staff and Administrators.
        </p>
        <Link to="/tickets" className="tt-btn tt-btn-primary">
          Return to My Tickets
        </Link>
      </div>
    );
  }

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "" ||
    priorityFilter !== "" ||
    assignmentFilter !== "all" ||
    categoryFilter !== "" ||
    systemFilter !== "";

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ marginBottom: "4px" }}>IT Support Staff Queue</h1>
          <p style={{ color: "var(--color-text-muted)", margin: 0, fontSize: "14px" }}>
            Search, filter, assign, and manage enterprise support tickets across all departments.
          </p>
        </div>
      </div>

      {/* Filter Bar Controls Card */}
      <div className="tt-card" style={{ marginBottom: "24px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
          {/* Keyword Search Input */}
          <div className="tt-form-group" style={{ marginBottom: 0 }}>
            <label className="tt-label" htmlFor="staff-search-input">Search Queue</label>
            <input
              id="staff-search-input"
              type="text"
              className="tt-input"
              data-testid="search-input"
              placeholder="Ticket #, summary, requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="tt-form-group" style={{ marginBottom: 0 }}>
            <label className="tt-label" htmlFor="status-filter-select">Status</label>
            <select
              id="status-filter-select"
              className="tt-select"
              data-testid="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Requester">Waiting for Requester</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* IT Priority Filter Dropdown */}
          <div className="tt-form-group" style={{ marginBottom: 0 }}>
            <label className="tt-label" htmlFor="priority-filter-select">IT Priority</label>
            <select
              id="priority-filter-select"
              className="tt-select"
              data-testid="priority-filter"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          {/* Assignment Filter Dropdown */}
          <div className="tt-form-group" style={{ marginBottom: 0 }}>
            <label className="tt-label" htmlFor="assignment-filter-select">Assignment</label>
            <select
              id="assignment-filter-select"
              className="tt-select"
              data-testid="assignment-filter"
              value={assignmentFilter}
              onChange={(e) => {
                setAssignmentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Tickets</option>
              <option value="unassigned">Unassigned</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters (Category & Related System) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="tt-form-group" style={{ marginBottom: 0 }}>
            <label className="tt-label" htmlFor="category-filter-select">Category</label>
            <select
              id="category-filter-select"
              className="tt-select"
              data-testid="category-filter"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="tt-form-group" style={{ marginBottom: 0 }}>
            <label className="tt-label" htmlFor="system-filter-select">Related System</label>
            <select
              id="system-filter-select"
              className="tt-select"
              data-testid="system-filter"
              value={systemFilter}
              onChange={(e) => {
                setSystemFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Systems</option>
              {relatedSystems.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters Action Button */}
          {hasActiveFilters && (
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="button"
                className="tt-btn tt-btn-outline"
                style={{ height: "38px", width: "100%", fontSize: "13px" }}
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setPriorityFilter("");
                  setAssignmentFilter("all");
                  setCategoryFilter("");
                  setSystemFilter("");
                  setPage(1);
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="tt-card" style={{ backgroundColor: "var(--color-error-bg)", borderColor: "var(--color-error)", color: "var(--color-error)", marginBottom: "24px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading Spinner View */}
      {loading ? (
        <div className="tt-card tt-empty-state">
          <div className="tt-spinner" title="Loading staff queue..." />
          <p style={{ marginTop: "12px", color: "var(--color-text-muted)" }}>Loading IT staff queue...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty State View */
        <div className="tt-card tt-empty-state" data-testid="empty-queue-state">
          <h3>No Support Tickets Found</h3>
          <p style={{ color: "var(--color-text-muted)", marginTop: "8px" }}>
            {hasActiveFilters
              ? "No tickets match your active filter and search criteria."
              : "There are currently no support tickets in the system queue."}
          </p>
        </div>
      ) : (
        /* Staff Queue Table View */
        <div className="tt-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tt-table" data-testid="staff-queue-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#F7FAFC", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>
                    <button
                      type="button"
                      data-testid="sort-ticketNumber"
                      style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: "13px" }}
                      onClick={() => handleSort("ticketNumber")}
                    >
                      Ticket # {sortBy === "ticketNumber" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px" }}>Requester</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px" }}>Category / System</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>
                    <button
                      type="button"
                      data-testid="sort-itPriority"
                      style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: "13px" }}
                      onClick={() => handleSort("itPriority")}
                    >
                      IT Priority {sortBy === "itPriority" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>
                    <button
                      type="button"
                      data-testid="sort-currentStatus"
                      style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: "13px" }}
                      onClick={() => handleSort("currentStatus")}
                    >
                      Status {sortBy === "currentStatus" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px" }}>Assignee</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>
                    <button
                      type="button"
                      data-testid="sort-createdAt"
                      style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: "13px" }}
                      onClick={() => handleSort("createdAt")}
                    >
                      Submitted {sortBy === "createdAt" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    data-testid={`ticket-row-${ticket.id}`}
                    style={{ borderBottom: "1px solid var(--color-border)", transition: "background-color 0.15s" }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <Link
                        to={`/tickets/${ticket.id}`}
                        style={{ fontWeight: 600, textDecoration: "none", color: "var(--color-primary)" }}
                      >
                        {ticket.ticketNumber}
                      </Link>
                      <div style={{ fontSize: "13px", color: "var(--color-text-main)", marginTop: "2px", fontWeight: 500 }}>
                        {ticket.summary}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 500, fontSize: "14px" }}>{ticket.requester?.name || "N/A"}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{ticket.requester?.email}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 500 }}>{ticket.category.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{ticket.relatedSystem.name}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {renderPriorityBadge(ticket.itPriority)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {renderStatusBadge(ticket.currentStatus, ticket.isRequesterResolved)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {ticket.assignedTo ? (
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#2B6CB0" }}>
                          👤 {ticket.assignedTo.name}
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--color-text-muted)" }}>
                      {formatDate(ticket.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          {pagination && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                backgroundColor: "#F7FAFC",
                borderTop: "1px solid var(--color-border)",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "var(--color-text-muted)" }}>
                <span>
                  Showing {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1} to{" "}
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} tickets
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label htmlFor="staff-page-size-select" style={{ fontSize: "12px" }}>Per page:</label>
                  <select
                    id="staff-page-size-select"
                    className="tt-select"
                    data-testid="page-size-select"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    style={{ padding: "4px 8px", fontSize: "12px", height: "30px" }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  className="tt-btn tt-btn-outline"
                  data-testid="prev-page"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setPage(page - 1)}
                  style={{ height: "32px", fontSize: "12px", padding: "0 12px" }}
                >
                  &larr; Previous
                </button>
                <span style={{ fontSize: "13px", fontWeight: 500, padding: "0 4px" }}>
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  className="tt-btn tt-btn-outline"
                  data-testid="next-page"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage(page + 1)}
                  style={{ height: "32px", fontSize: "12px", padding: "0 12px" }}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffQueuePage;
