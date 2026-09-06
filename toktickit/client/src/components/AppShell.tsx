import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

export interface AppShellProps {
  selectedRequesterName?: string | null;
  onChangeRequester?: () => void;
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  selectedRequesterName,
  onChangeRequester,
  children,
}) => {
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
            {selectedRequesterName ? (
              <>
                <span className="tt-requester-badge" title="Active Requester Context">
                  👤 {selectedRequesterName}
                </span>
                {onChangeRequester && (
                  <button
                    type="button"
                    className="tt-btn tt-btn-outline"
                    onClick={onChangeRequester}
                    style={{ borderColor: "#FFFFFF", color: "#FFFFFF", height: "32px", fontSize: "12px" }}
                  >
                    Change Requester
                  </button>
                )}
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

      <footer className="tt-footer">
        TokTickIT &copy; {new Date().getFullYear()} &middot; Requester Ticketing System
      </footer>
    </div>
  );
};

export default AppShell;
