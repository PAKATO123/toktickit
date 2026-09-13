import { describe, it } from "vitest";

describe.todo("Lab 03 — Server-Side Authorization Guards (authorization.api.test.ts)", () => {
  it("restricts Requester to viewing and querying only owned tickets");
  it("rejects cross-requester ticket detail access with 403 Forbidden");
  it("rejects Requester access to IT Staff Queue endpoint with 403 Forbidden");
  it("rejects Requester access to Internal Notes endpoints with 403 Forbidden");
  it("rejects non-Admin access to User Management endpoints with 403 Forbidden");
});
