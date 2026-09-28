import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequesterProvider } from "./context/RequesterContext";
import { AuthProvider } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import RequesterGuard from "./components/RequesterGuard";
import RequesterSelectorPage from "./pages/RequesterSelectorPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import CreateTicketPage from "./pages/CreateTicketPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import StaffQueuePage from "./pages/StaffQueuePage";
import AdminGuard from "./components/AdminGuard";
import { UserManagementPage } from "./pages/UserManagementPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<RequesterSelectorPage />} />
        <Route element={<RequesterGuard />}>
          <Route path="tickets" element={<MyTicketsPage />} />
          <Route path="tickets/new" element={<CreateTicketPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="staff/queue" element={<StaffQueuePage />} />
          <Route element={<AdminGuard />}>
            <Route path="admin/users" element={<UserManagementPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RequesterProvider>
    </AuthProvider>
  );
}
