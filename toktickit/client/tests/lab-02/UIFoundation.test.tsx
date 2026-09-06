import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "../../src/components/AppShell";
import RequesterSelectorPage from "../../src/pages/RequesterSelectorPage";
import MyTicketsPage from "../../src/pages/MyTicketsPage";
import CreateTicketPage from "../../src/pages/CreateTicketPage";
import TicketDetailPage from "../../src/pages/TicketDetailPage";

describe("Lab 02 Feature 3 — UI Foundation & Application Shell", () => {
  it("renders AppShell brand wordmark and navigation links", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell selectedRequesterName="Alice Chen">
          <div>Content</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /TokTickIT Home/i })).toBeInTheDocument();
    expect(screen.getByText(/My Tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/Alice Chen/i)).toBeInTheDocument();
  });

  it("renders Requester Selector page at route /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<RequesterSelectorPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Select Development Requester/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
  });

  it("renders My Tickets page at route /tickets", () => {
    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="tickets" element={<MyTicketsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /My Tickets/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search tickets/i)).toBeInTheDocument();
  });

  it("renders Create Ticket page at route /tickets/new", () => {
    render(
      <MemoryRouter initialEntries={["/tickets/new"]}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="tickets/new" element={<CreateTicketPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Create New Ticket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit Ticket/i })).toBeInTheDocument();
  });

  it("renders Ticket Detail page at route /tickets/:id", () => {
    render(
      <MemoryRouter initialEntries={["/tickets/TICK-2026-0099"]}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="tickets/:id" element={<TicketDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Ticket #TICK-2026-0099/i)).toBeInTheDocument();
  });
});
