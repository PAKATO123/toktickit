import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequesterProvider } from "./context/RequesterContext";
import AppShell from "./components/AppShell";
import RequesterGuard from "./components/RequesterGuard";
import RequesterSelectorPage from "./pages/RequesterSelectorPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import CreateTicketPage from "./pages/CreateTicketPage";
import TicketDetailPage from "./pages/TicketDetailPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<RequesterSelectorPage />} />
        <Route element={<RequesterGuard />}>
          <Route path="tickets" element={<MyTicketsPage />} />
          <Route path="tickets/new" element={<CreateTicketPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </RequesterProvider>
  );
}
