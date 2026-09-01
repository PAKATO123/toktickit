import React, { useState } from "react";
import { Link, NavLink, useNavigate, Outlet } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";

export interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const navigate = useNavigate();
  const { selectedRequester, clearSelectedRequester, isFormDirty, setIsFormDirty } = useRequester();
  const [showDirtyModal, setShowDirtyModal] = useState<boolean>(false);

  const handleChangeRequesterClick = () => {
    if (isFormDirty) {
      setShowDirtyModal(true);
    } else {
      executeChangeRequester();
    }
  };

  const executeChangeRequester = () => {
    setShowDirtyModal(false);
    setIsFormDirty(false);
    clearSelectedRequester();
    navigate("/");
  };

  return (
    <div className="tt-shell">
      <header className="tt-header">
        <div className="tt-header-inner">
          <Link to="/" className="tt-brand" aria-label="TokTickIT Home">
            <span role="img" aria-label="ticket icon">🎫</span> TokTickIT
          </Link>

          <nav className="tt-nav" aria-label="Main Navigation">
            <NavLink
              to="/tickets"
              className={({ isActive }) =>
                `tt-nav-link ${isActive ? "active" : ""}`
              }
              end
            >
              My Tickets
            </NavLink>
            <NavLink
              to="/tickets/new"
              className={({ isActive }) =>
                `tt-nav-link ${isActive ? "active" : ""}`
              }
            >
              Create Ticket
            </NavLink>
          </nav>

          <div className="tt-header-right">
            {selectedRequester ? (
              <>
                <span className="tt-requester-badge" title="Active Requester Context">
                  👤 {selectedRequester.name} {selectedRequester.department ? `(${selectedRequester.department})` : ""}
                </span>
                <button
                  type="button"
                  className="tt-btn tt-btn-outline"
                  onClick={handleChangeRequesterClick}
                  style={{ borderColor: "#FFFFFF", color: "#FFFFFF", height: "32px", fontSize: "12px" }}
                >
                  Change Requester
                </button>
              </>
            ) : (
              <span className="tt-requester-badge" style={{ opacity: 0.8 }}>
                No Requester Selected
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="tt-main-container">
        {children ? children : <Outlet />}
      </main>

      {showDirtyModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
        >
          <div className="tt-card" style={{ maxWidth: "450px", width: "90%", margin: 0 }}>
            <h3>Discard Unsaved Draft?</h3>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "20px" }}>
              Switching requester will discard your unsaved ticket draft. Do you want to continue?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="tt-btn tt-btn-outline"
                onClick={() => setShowDirtyModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tt-btn tt-btn-danger"
                onClick={executeChangeRequester}
              >
                Discard & Switch
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="tt-footer">
        TokTickIT &copy; {new Date().getFullYear()} &middot; Requester Ticketing System
      </footer>
    </div>
  );
};

export default AppShell;
