import React, { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [toastMessage, setToastMessage] = useState<string | null>(
    (location.state as { toastMessage?: string })?.toastMessage || null
  );

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative" }}>
      {/* Success Toast Notification (FR-13, AC-18, AD-03) */}
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1>Ticket #{id || "TICK-2026-0001"}</h1>
          <span className="tt-badge tt-badge-new">New</span>
        </div>
      </div>

      <div className="tt-card">
        <div className="tt-form-group">
          <label className="tt-label">Summary</label>
          <input
            type="text"
            className="tt-input tt-readonly"
            readOnly
            value="Sample ticket summary placeholder"
          />
        </div>

        <div className="tt-form-group">
          <label className="tt-label">Description</label>
          <textarea
            className="tt-textarea tt-readonly"
            readOnly
            value="Sample ticket detailed description placeholder."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
