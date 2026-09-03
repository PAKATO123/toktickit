import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { getTicketDetail, TicketDetailData } from "../api";

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(
    (location.state as { toastMessage?: string })?.toastMessage || null
  );

  // Track initial requester ID to detect requester switches (BR-07)
  const initialRequesterIdRef = useRef<number | null>(selectedRequester ? selectedRequester.id : null);

  // BR-07: Redirect to /tickets if requester context changes while on detail page
  useEffect(() => {
    if (selectedRequester && initialRequesterIdRef.current !== null && selectedRequester.id !== initialRequesterIdRef.current) {
      navigate("/tickets");
    }
  }, [selectedRequester, navigate]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Fetch ticket details on mount & when id or requester changes
  useEffect(() => {
    let isMounted = true;

    async function loadTicket() {
      if (!id || !selectedRequester) return;

      setLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      try {
        const data = await getTicketDetail(id, selectedRequester.id);
        if (isMounted) {
          setTicket(data);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error fetching ticket detail:", err);
          setErrorStatus(err.status || 500);
          setErrorMessage(err.message || "Unable to load ticket details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTicket();
  }, [id, selectedRequester]);

  const renderPriorityBadge = (priority: string | null) => {
    if (!priority) {
      return <span style={{ color: "var(--color-text-muted)" }}>Unassigned (Omitted)</span>;
    }
    const up = priority.toUpperCase();
    if (up === "URGENT") return <span className="tt-badge tt-badge-urgent">Urgent</span>;
    if (up === "HIGH") return <span className="tt-badge tt-badge-high">High</span>;
    if (up === "MEDIUM") return <span className="tt-badge tt-badge-medium">Medium</span>;
    if (up === "LOW") return <span className="tt-badge tt-badge-low">Low</span>;
    return <span className="tt-badge">{priority}</span>;
  };

  const renderStatusBadge = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === "new") return <span className="tt-badge tt-badge-new">New</span>;
    if (lower === "in progress") return <span className="tt-badge tt-badge-medium">In Progress</span>;
    if (lower === "resolved") {
      return (
        <span className="tt-badge" style={{ backgroundColor: "#E6FFFA", color: "#234E52", border: "1px solid #319795" }}>
          Resolved
        </span>
      );
    }
    if (lower === "closed") {
      return (
        <span className="tt-badge" style={{ backgroundColor: "#EDF2F7", color: "#4A5568", border: "1px solid #CBD5E0" }}>
          Closed
        </span>
      );
    }
    return <span className="tt-badge">{status}</span>;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative" }}>
      {/* Success Toast Notification */}
      {toastMessage && (
        <div className="tt-toast" role="status">
          <span>✅</span>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary-green)",
              fontWeight: "bold",
              cursor: "pointer",
              marginLeft: "12px",
              fontSize: "14px",
            }}
            title="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <Link to="/tickets" style={{ fontSize: "14px", textDecoration: "none" }}>
          &larr; Back to My Tickets
        </Link>
      </div>

      {loading ? (
        <div className="tt-card tt-empty-state">
          <div className="tt-spinner" />
          <p style={{ marginTop: "12px" }}>Loading ticket details...</p>
        </div>
      ) : errorStatus === 403 ? (
        /* 403 Forbidden State View (BR-10, AC-38) */
        <div className="tt-card tt-empty-state" style={{ backgroundColor: "var(--color-error-bg)", borderColor: "var(--color-error)" }}>
          <h2 style={{ color: "var(--color-error)", marginBottom: "8px" }}>403 Access Denied</h2>
          <p style={{ color: "var(--color-text-main)", marginBottom: "20px" }}>
            {errorMessage || "You do not have permission to view this ticket as it belongs to another requester."}
          </p>
          <Link to="/tickets" className="tt-btn tt-btn-primary">
            Return to My Tickets
          </Link>
        </div>
      ) : errorStatus === 404 ? (
        /* 404 Not Found State View (AC-40) */
        <div className="tt-card tt-empty-state">
          <h2 style={{ marginBottom: "8px" }}>404 Ticket Not Found</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "20px" }}>
            {errorMessage || "The requested ticket could not be found."}
          </p>
          <Link to="/tickets" className="tt-btn tt-btn-primary">
            Return to My Tickets
          </Link>
        </div>
      ) : errorStatus ? (
        /* General API Error View */
        <div className="tt-card tt-empty-state" style={{ backgroundColor: "var(--color-error-bg)", borderColor: "var(--color-error)" }}>
          <h3 style={{ color: "var(--color-error)" }}>Unable to load ticket details</h3>
          <p>{errorMessage}</p>
          <Link to="/tickets" className="tt-btn tt-btn-outline" style={{ marginTop: "12px" }}>
            Return to My Tickets
          </Link>
        </div>
      ) : ticket ? (
        /* Read-Only Ticket Detail Screen (FR-23, AC-37) */
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h1 style={{ marginBottom: "4px" }}>Ticket #{ticket.ticketNumber}</h1>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {renderStatusBadge(ticket.currentStatus)}
                {renderPriorityBadge(ticket.requestedPriority)}
              </div>
            </div>
          </div>

          <div className="tt-card">
            {/* Requester Identity */}
            <div className="tt-form-group">
              <label className="tt-label">Development Requester</label>
              <input
                type="text"
                className="tt-input tt-readonly"
                readOnly
                value={`${ticket.requester?.name || selectedRequester?.name} (${ticket.requester?.department || selectedRequester?.department})`}
              />
            </div>

            {/* Category & Related System Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="tt-form-group">
                <label className="tt-label">Category</label>
                <input type="text" className="tt-input tt-readonly" readOnly value={ticket.category.name} />
              </div>
              <div className="tt-form-group">
                <label className="tt-label">Related System</label>
                <input type="text" className="tt-input tt-readonly" readOnly value={ticket.relatedSystem.name} />
              </div>
            </div>

            {/* Summary */}
            <div className="tt-form-group">
              <label className="tt-label">Summary</label>
              <input type="text" className="tt-input tt-readonly" readOnly value={ticket.summary} />
            </div>

            {/* Description */}
            <div className="tt-form-group">
              <label className="tt-label">Description</label>
              <textarea className="tt-textarea tt-readonly" readOnly value={ticket.description} />
            </div>

            {/* Timestamps */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Submitted On:</span>
                <p style={{ margin: "2px 0 0 0", fontWeight: 500 }}>{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Last Updated:</span>
                <p style={{ margin: "2px 0 0 0", fontWeight: 500 }}>{formatDate(ticket.updatedAt)}</p>
              </div>
            </div>

            {/* Active Attachments Section (FR-27) */}
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--color-border)" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>
                Attachments ({ticket.attachments.length})
              </h3>

              {ticket.attachments.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px", margin: 0 }}>
                  No initial attachments uploaded with this ticket.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {ticket.attachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--color-surface)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "18px" }}>{att.contentType.includes("pdf") ? "📄" : "🖼️"}</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>{att.fileName}</p>
                          <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                            {formatFileSize(att.fileSize)} · Uploaded {formatDate(att.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TicketDetailPage;
