import { describe, it } from "vitest";

describe.todo("Lab 03 — Authentication & Password Change API (auth.api.test.ts)", () => {
  it("authenticates valid credentials and returns session context");
  it("rejects invalid credentials with 401 Unauthorized");
  it("rejects deactivated user login with 401 Unauthorized");
  it("enforces mandatory first-login password change");
  it("updates password and clears mustChangePassword flag");
  it("destroys session on logout");
});
