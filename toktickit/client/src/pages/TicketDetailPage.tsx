import React from "react";
import { Link, useParams } from "react-router-dom";

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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
