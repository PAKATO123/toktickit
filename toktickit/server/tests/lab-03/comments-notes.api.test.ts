import { describe, it } from "vitest";

describe.todo("Lab 03 — Public Comments & Confidential Internal Notes API (comments-notes.api.test.ts)", () => {
  it("allows Ticket Owner and IT Staff to post and view Public Comments");
  it("allows IT Staff and Admin to create and view confidential Internal Notes");
  it("rejects Requester access to Internal Notes endpoints with 403 Forbidden");
  it("rejects empty or whitespace-only comment and note content");
  it("binds author ID and server timestamp automatically");
});
