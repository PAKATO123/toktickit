# Lab 3 — Peer Review Record

**Author:** Pattarapon Sribuathong — 67070503434 — GitHub: @PAKATO123
**Peer reviewer:** Tammathorn Kananurak — 67070503489 — GitHub: @Tammathorn

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
|    | feature/lab03-00-engineering-contract | Approved |
|    | feature/lab03-01-schema-and-migration | Approved |
|    | feature/lab03-02-auth-backend | Approved |
|    | feature/lab03-03-authorization-and-requester-refactor | Approved |
|    | feature/lab03-04-staff-queue-and-workflow-backend | Approved |
|    | feature/lab03-05-auth-ui | Approved |
|    | feature/lab03-06-requester-resolution-ui | Approved |
|    | feature/lab03-07-staff-queue-ui | Approved |
|    | feature/lab03-08-staff-ticket-detail-ui | Approved |
|    | feature/lab03-09-admin-users | Approved |
|    | feature/lab03-10-e2e-and-docs | Approved* |
|    | lab3-PostImplementationCleanup1 | Approved |


**Branch  9 - feature/lab03-08-staff-ticket-detail-ui**
https://github.com/PAKATO123/toktickit/pull/47
| Verdict | Request changes |
Reviewer comment I received: Request changes — staff cannot open attachments

How I responded: Will be addressed in cleanup branch


**Branch 11 - feature/lab03-10-e2e-and-docs**
https://github.com/PAKATO123/toktickit/pull/49
| Verdict | Approved* |
Reviewer comment I received: Staff and Admin users get 403 Forbidden when opening attachments

comments-notes.api.test.ts and staff-ticket-detail.api.test.ts contain only describe.todo(...) stubs.

IT Priority Dropdown UI passes uppercase (HIGH, URGENT) while the specs defines title case

Password change modal overlay blocks header navigation and sign-out button.

How I responded: Addressed in lab3-PostImplementationCleanup1 cleanup branch.

## Pull Requests I reviewed for my partner
https://github.com/Tammathorn/toktickit/pull/46
My comment: I recommend clarifying one edge case
Comments on Terminal Tickets, The status transition matrix strictly defines CLOSED and CANCELLED as terminal states.
but Business Rule 68 broadly allows the owning Requester, IT Staff, and Administrator to post Public Comments on a Ticket without mentioning status constraints.
You should maybe clarify if the users are still allowed to write comments to a ticket still after the ticket is closed.

Partner's response: Thanks, good catch. I've settled it as C-109: Closed and Cancelled tickets are read-only for everyone. No comments, notes, attachment changes, or owner/priority/status changes (409). Reading still works. Since C-98 makes both statuses terminal, the Requester opens a new ticket instead. Resolved can still take comments because it can be reopened.
