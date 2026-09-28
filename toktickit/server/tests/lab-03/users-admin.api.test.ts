import { describe, it } from "vitest";

describe.todo("Lab 03 — Administrator User Management API (users-admin.api.test.ts)", () => {
  it("allows Administrator to list users with search and role filter");
  it("allows Administrator to create user with initial password and forced change flag");
  it("rejects duplicate user email creation with 409 Conflict");
  it("allows Administrator to update name, email, role, and active status");
  it("rejects Administrator self-deactivation with 400 Bad Request");
  it("rejects deactivating the last active Administrator with 400 Bad Request");
  it("allows Administrator to set a new initial password");
});
