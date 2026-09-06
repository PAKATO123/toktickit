import React from "react";
import { Link } from "react-router-dom";

export const MyTicketsPage: React.FC = () => {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1>My Tickets</h1>
          <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
            View and manage your submitted IT support tickets.
          </p>
        </div>
        <Link to="/tickets/new" className="tt-btn tt-btn-primary">
          + Create Ticket
        </Link>
      </div>

      <div className="tt-card">
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input
            type="text"
            className="tt-input"
            placeholder="Search tickets by number, summary..."
            style={{ flex: 1, minWidth: "240px" }}
          />
          <select className="tt-select" style={{ width: "160px" }}>
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select className="tt-select" style={{ width: "160px" }}>
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="tt-empty-state">
          <h3>No tickets found</h3>
          <p>No tickets have been created yet for this requester context.</p>
        </div>
      </div>
    </div>
  );
};

export default MyTicketsPage;
