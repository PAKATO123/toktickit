import React from "react";
import { Link } from "react-router-dom";

export const CreateTicketPage: React.FC = () => {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "16px" }}>
        <Link to="/tickets" style={{ fontSize: "14px", textDecoration: "none" }}>
          &larr; Back to My Tickets
        </Link>
      </div>

      <h1>Create New Ticket</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "24px" }}>
        Submit a new IT support request. Required fields are marked with an asterisk (<span className="tt-required-asterisk">*</span>).
      </p>

      <div className="tt-card">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="tt-form-group">
            <label className="tt-label">
              Category <span className="tt-required-asterisk">*</span>
            </label>
            <select className="tt-select" defaultValue="">
              <option value="" disabled>-- Select Category --</option>
              <option value="1">Account and Access</option>
              <option value="2">Hardware</option>
              <option value="3">Software</option>
              <option value="4">Network</option>
            </select>
          </div>

          <div className="tt-form-group">
            <label className="tt-label">
              Related System <span className="tt-required-asterisk">*</span>
            </label>
            <select className="tt-select" defaultValue="">
              <option value="" disabled>-- Select Related System --</option>
              <option value="1">Email & Collaboration</option>
              <option value="2">VPN & Remote Access</option>
              <option value="3">HR & Payroll Portal</option>
            </select>
          </div>

          <div className="tt-form-group">
            <label className="tt-label">
              Summary <span className="tt-required-asterisk">*</span>
            </label>
            <input
              type="text"
              className="tt-input"
              placeholder="Brief summary of the issue (max 255 chars)"
              maxLength={255}
            />
          </div>

          <div className="tt-form-group">
            <label className="tt-label">
              Description <span className="tt-required-asterisk">*</span>
            </label>
            <textarea
              className="tt-textarea"
              placeholder="Full detailed explanation of the request (at least 20 characters)"
            ></textarea>
          </div>

          <div className="tt-form-group">
            <label className="tt-label">Requested Priority</label>
            <select className="tt-select" defaultValue="">
              <option value="">-- Optional --</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
            <Link to="/tickets" className="tt-btn tt-btn-outline">
              Cancel
            </Link>
            <button type="submit" className="tt-btn tt-btn-primary">
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketPage;
