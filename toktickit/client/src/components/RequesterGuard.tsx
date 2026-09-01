import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";

export interface RequesterGuardProps {
  children?: React.ReactNode;
}

export const RequesterGuard: React.FC<RequesterGuardProps> = ({ children }) => {
  const { selectedRequester } = useRequester();

  if (!selectedRequester) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RequesterGuard;
