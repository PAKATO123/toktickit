import React from "react";

export const RequesterSelectorPage: React.FC = () => {
  return (
    <div className="tt-card" style={{ maxWidth: "600px", margin: "40px auto" }}>
      <h1>Select Development Requester</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "24px" }}>
        Select a Development Requester to test requester-specific ticket behavior.
        This is not a login screen. Authentication and role-based access will be introduced in Lab 3.
      </p>

      <div className="tt-form-group">
        <label className="tt-label">
          Development Requester <span className="tt-required-asterisk">*</span>
        </label>
        <select className="tt-select" defaultValue="">
          <option value="" disabled>-- Select Requester --</option>
          <option value="1">Alice Chen (Engineering)</option>
          <option value="2">Bob Smith (Marketing)</option>
          <option value="3">Carlos Ray (Finance)</option>
          <option value="4">Diana Prince (Operations)</option>
        </select>
      </div>

      <button type="button" className="tt-btn tt-btn-primary" style={{ width: "100%", marginTop: "16px" }}>
        Continue
      </button>
    </div>
  );
};

export default RequesterSelectorPage;
