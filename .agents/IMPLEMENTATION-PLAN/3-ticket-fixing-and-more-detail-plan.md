# Phase 3 — Stabilization + Main Follow-up Flow Foundation

## 1. Goal

Build the main operational flow of ACCESS after Phase 1 and Phase 2.

This phase focuses on making unresolved complaints move through the real support workflow:

```txt
Agent saves complaint from Quick Response
↓
If resolved, complaint is completed
↓
If follow-up is needed, ticket is created
↓
Agent escalates ticket
↓
System groups it into a manager cluster
↓
Manager records action taken
↓
Agent sends final closure response
↓
Complaint is resolved and ticket is closed
```

This phase should prioritize the main flow, not supporting features.

---

## 2. Main Principle

Build vertically, not module-first.

Do not start by building every possible CRUD endpoint.

Build the smallest complete workflow first:

```txt
Quick Response
→ Ticket
→ Action Request Cluster
→ Manager Action
→ Agent Closure
```

After this flow works, add supporting list/detail/update endpoints.

---

## 3. Phase Scope

Build:

```txt
tickets
action_requests
action_request_complaints

ticket creation from Quick Response
ticket escalation to manager cluster
rule-based manager clustering
manager take-action flow
agent final closure flow
basic ticket list/detail
basic action request list/detail
```

Do not build yet:

```txt
reference_sources
reference_tags
reference_source_tags
quick_response_references
action_request_references
suggestion pipeline
quick response preview
ticket_events
audit_logs
dashboard
agent_performance
AI/RAG
public complaint submission
passenger tracking
```

References are postponed because they are supporting material, not the main workflow.

---

## 4. Phase Position

Current completed or previous phases:

```txt
Phase 1 — Auth
Phase 2 — Complaint + Manual Quick Response Save
```

Current phase:

```txt
Phase 3 — Stabilization + Main Follow-up Flow Foundation
```

Future phases:

```txt
Phase 4 — References Foundation
Phase 5 — Reference Usage in Flow
Phase 6 — Suggestion Pipeline
Phase 7 — Dashboard + Audit + Events
Phase 8 — Agent Performance / Public Tracking / AI later
```

This phase should not depend on references, AI, or suggestion generation.

---

# Part A — Stabilization Before Extending

## 5. Why Stabilize First

Tickets and action requests depend on:

```txt
users
complaints
quick_response_sessions
```

If auth, complaint creation, or quick response saving is still buggy, the follow-up workflow will inherit those bugs.

Before adding new tables, verify Phase 1 and Phase 2.

---

## 6. Auth Verification Checklist

```txt
[ ] Seeded users exist for admin, manager, and at least 2 agents.
[ ] Login with correct credentials returns 200 + token + user.
[ ] Login with wrong password returns 401 with generic message.
[ ] Login with non-existent email returns the same generic message.
[ ] Login for inactive user is rejected.
[ ] GET /auth/me with valid token returns current user.
[ ] GET /auth/me with missing token returns 401.
[ ] GET /auth/me with expired/invalid token returns 401.
[ ] password_hash never appears in any response body.
[ ] JWT payload contains safe data only: sub, email, role.
```

---

## 7. Complaint + Quick Response Verification Checklist

```txt
[ ] POST /quick-responses creates complaint + quick_response_session in one transaction.
[ ] If quick_response_session insert fails, complaint insert is rolled back.
[ ] reference_no is unique and matches format ACC-YYYYMMDD-XXXX.
[ ] tracking_token is unique and non-guessable.
[ ] outcome = sent_resolved sets complaint.status = resolved and resolved_at = now.
[ ] outcome = sent_hea_action sets complaint.status = waiting_action and resolved_at = null.
[ ] outcome = sent_hea_action returns requiresFollowUp = true.
[ ] outcome = copy_only sets complaint.status = submitted and resolved_at = null.
[ ] GET /complaints supports pagination.
[ ] GET /complaints supports status/category/source/search filters.
[ ] GET /complaints/:id returns complaint + quick_response_sessions.
[ ] PATCH /complaints/:id updates only basic complaint fields.
[ ] PATCH /complaints/:id/status updates status safely.
[ ] Manager cannot POST /quick-responses.
[ ] Manager cannot PATCH complaint or complaint status in this phase.
[ ] Agent and admin can access allowed complaint/quick-response actions.
```

---

## 8. Safety Nets

Before adding Phase 3 flow, make sure:

```txt
[ ] Centralized error handler exists.
[ ] Validation errors return 400, not 500.
[ ] Unauthorized requests return 401.
[ ] Forbidden role access returns 403.
[ ] Database connection failure logs clearly and exits.
[ ] .env.example exists and includes DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGIN.
```

---

## 9. Stabilization Exit Criteria

Do not start Phase 3 tables until:

```txt
Auth checklist passes.
Complaint + Quick Response checklist passes.
Safety nets exist.
No known open bugs in Phase 1 and Phase 2 core flow.
```

---

# Part B — Main Flow Definition

## 10. Direct Resolution Flow

When agent saves Quick Response with:

```txt
outcome = sent_resolved
```

Backend should:

```txt
create complaint
create quick_response_session
set complaint.status = resolved
set complaint.resolved_at = now
do not create ticket
do not create action_request
```

Response should include:

```txt
ticket = null
requiresFollowUp = false
```

---

## 11. Follow-up Creation Flow

When agent saves Quick Response with:

```txt
outcome = sent_hea_action
```

Backend should:

```txt
create complaint
create ticket
create quick_response_session linked to ticket
set complaint.status = waiting_action
set ticket.status = hea_sent
set quick_response_sessions.ticket_id = ticket.id
return requiresFollowUp = true
```

Important rule:

```txt
sent_hea_action creates ticket.
sent_hea_action does not automatically create action_request.
```

Reason:

```txt
Ticket means internal follow-up is needed.
Action request means manager-level grouped issue is needed.
Agent should explicitly escalate the ticket into manager queue.
```

---

## 12. Copy Only Flow

When agent saves Quick Response with:

```txt
outcome = copy_only
```

Backend should:

```txt
create complaint
create quick_response_session
set complaint.status = submitted
do not create ticket
do not create action_request
```

Response should include:

```txt
ticket = null
requiresFollowUp = false
```

---

## 13. Escalation to Manager Cluster Flow

When agent escalates ticket:

```txt
POST /tickets/:id/escalate
```

Backend should:

```txt
find ticket
find complaint linked to ticket
detect issue_key from complaint.category + complaint.complaint_text
build grouping_key
find active action_request with same grouping_key within time window
if found, link complaint/ticket to existing action_request
if not found, create new action_request
insert action_request_complaints row
set ticket.status = waiting_manager_action
return ticket + action_request
```

This is the first version of manager clustering.

No AI, embedding, or semantic clustering is used in this phase.

---

## 14. Manager Take Action Flow

When manager records action:

```txt
PATCH /action-requests/:id/take-action
```

Backend should:

```txt
update action_request.action_taken
update action_request.closure_message
set action_request.status = action_taken
set action_request.resolved_at = now
set all linked tickets.status = manager_action_done
```

Important:

```txt
Do not set complaint.status = resolved here.
```

Reason:

```txt
Manager provides the operational action.
Agent still needs to send the final customer-facing closure response.
```

---

## 15. Agent Final Closure Flow

When manager action is done, agent sends final response to customer.

Use endpoint:

```txt
POST /complaints/:id/quick-responses
```

Purpose:

```txt
Create a quick_response_session for an existing complaint.
```

This endpoint is different from:

```txt
POST /quick-responses
```

because `POST /quick-responses` creates a new complaint from the Quick Response workspace.

Final closure should:

```txt
create quick_response_session linked to existing complaint
link quick_response_session.ticket_id = ticket.id
set complaint.status = resolved
set complaint.resolved_at = now
set ticket.status = closed
set ticket.closure_message = finalResponse
set ticket.closure_sent_at = now
```

Optional rule:

```txt
If all tickets linked to the same action_request are closed:
  set action_request.status = closed
```

---

# Part C — Manager Clustering v1

## 16. Cluster Definition

In ACCESS, manager cluster is represented by:

```txt
action_requests
```

Cluster membership is represented by:

```txt
action_request_complaints
```

Meaning:

```txt
action_requests = grouped manager issue
action_request_complaints = complaints/tickets inside that group
```

Manager page should query:

```txt
action_requests
```

not individual tickets.

---

## 17. Clustering Strategy

Use simple rule-based clustering.

Do not use AI or ML yet.

Clustering v1:

```txt
category + issue_key + time_window
```

Flow:

```txt
1. Detect issue_key from complaint category and complaint text.
2. Build grouping_key from category + issue_key.
3. Search active action_request with same grouping_key inside time window.
4. If found, link complaint/ticket to existing action_request.
5. If not found, create new action_request.
```

---

## 18. Why Not Category Only

Do not cluster only by category.

Bad example:

```txt
payment + 7 days
```

This can mix different payment issues:

```txt
saldo terpotong tiket tidak muncul
refund belum masuk
double charge
payment gateway timeout
voucher gagal dipakai
```

Better:

```txt
payment + saldo_terpotong_tiket_tidak_muncul + 7 days
payment + refund_belum_masuk + 7 days
payment + double_charge + 7 days
```

---

## 19. `issue_key`

`issue_key` is the detected type of problem.

Examples:

```txt
saldo_terpotong_tiket_tidak_muncul
delay_tanpa_pemberitahuan
pembatalan_gagal
refund_belum_masuk
payment_gateway_error
barang_tertinggal
facility_rusak
app_crash_payment
payment_general
delay_general
```

Fallback rule:

```txt
If no specific rule matches:
  issue_key = <category>_general
```

Example:

```txt
category = payment
issue_key = payment_general
```

---

## 20. `grouping_key`

`grouping_key` is the final key used to search cluster.

For v1:

```txt
grouping_key = category + ":" + issue_key
```

Examples:

```txt
payment:saldo_terpotong_tiket_tidak_muncul
delay:delay_tanpa_pemberitahuan
cancellation:pembatalan_gagal
app_error:payment_gateway_error
```

Future version can add more context:

```txt
delay:delay_tanpa_pemberitahuan:KA123:2026-06-22
facility:toilet_rusak:stasiun_solo
app_error:payment_gateway_error:android
```

This makes the schema future-proof while keeping v1 simple.

---

## 21. Time Window

Use configurable time window.

Default:

```txt
7 days
```

Recommended category-specific window:

```txt
payment       → 7 days
refund        → 7 days
delay         → 1 day
cancellation  → 7 days
app_error     → 3 days
facility      → 14 days
lost_item     → 1 day or do not aggressively group
other         → 7 days
```

For v1, it is acceptable to use default 7 days for all categories.

But write the service so the window can be changed per category later.

---

## 22. Issue Key Detection v1

Create helper:

```txt
src/modules/action-requests/action-request-grouping.service.ts
```

Functions:

```txt
detectIssueKey(category, complaintText)
buildGroupingKey(category, issueKey)
getGroupingWindowDays(category)
makeClusterLabel(category, issueKey)
makeIssueSummary(complaint)
```

Example logic:

```ts
function detectIssueKey(category: string, text: string) {
  const normalized = normalizeText(text)

  if (
    category === "payment" &&
    containsAny(normalized, ["saldo", "uang", "terpotong", "kepotong", "debit"]) &&
    containsAny(normalized, ["tiket tidak muncul", "tiket belum muncul", "tiket belum keluar", "tiket tidak ada"])
  ) {
    return "saldo_terpotong_tiket_tidak_muncul"
  }

  if (
    category === "delay" &&
    containsAny(normalized, ["terlambat", "telat", "delay"]) &&
    containsAny(normalized, ["tidak ada pemberitahuan", "tanpa pemberitahuan", "notifikasi", "info"])
  ) {
    return "delay_tanpa_pemberitahuan"
  }

  if (
    category === "cancellation" &&
    containsAny(normalized, ["batal", "pembatalan", "cancel"]) &&
    containsAny(normalized, ["gagal", "tidak bisa", "error"])
  ) {
    return "pembatalan_gagal"
  }

  if (
    category === "refund" &&
    containsAny(normalized, ["refund", "pengembalian", "dikembalikan"]) &&
    containsAny(normalized, ["belum", "lama", "tidak masuk"])
  ) {
    return "refund_belum_masuk"
  }

  if (
    category === "app_error" &&
    containsAny(normalized, ["error", "crash", "force close", "blank"]) &&
    containsAny(normalized, ["bayar", "payment", "pembayaran"])
  ) {
    return "app_crash_payment"
  }

  return `${category}_general`
}
```

Keep this simple.

Do not over-engineer.

---

## 23. Cluster Search Rule

When escalating ticket, search action request with:

```txt
same grouping_key
status in open, reviewing
raised_at >= now - window_days
```

If found:

```txt
link ticket/complaint to existing action_request
```

If not found:

```txt
create new action_request
```

---

## 24. Cluster Creation Rule

When creating new action_request, fill:

```txt
category = complaint.category
issue_key = detected issue_key
grouping_key = built grouping_key
cluster_label = readable label from issue_key
issue_summary = first complaint summary
status = open
raised_at = now
```

Example:

```txt
category = payment
issue_key = saldo_terpotong_tiket_tidak_muncul
grouping_key = payment:saldo_terpotong_tiket_tidak_muncul
cluster_label = Saldo terpotong, tiket tidak muncul
issue_summary = Beberapa pelanggan melaporkan saldo terpotong tetapi tiket tidak terbit.
```

---

# Part D — Database Changes

## 25. Tables to Add

Add:

```txt
tickets
action_requests
action_request_complaints
```

Update:

```txt
quick_response_sessions.ticket_id
```

---

## 26. Migration Order

Use separate migration files:

```txt
1. Create tickets table.
2. Add FK from quick_response_sessions.ticket_id to tickets.id.
3. Create action_requests table.
4. Create action_request_complaints table.
```

Reason:

```txt
Smaller migrations are easier to debug.
```

---

## 27. `tickets` Table

Purpose:

```txt
Internal agent work item for complaints that need follow-up.
```

Fields:

```txt
id
complaint_id
agent_id
status
priority
hea_response
hea_sent_at
closure_message
closure_sent_at
created_at
updated_at
```

Constraints:

```txt
id primary key
complaint_id references complaints.id
complaint_id unique
agent_id references users.id nullable
status default open
priority default medium
created_at required
updated_at required
```

Indexes:

```txt
complaint_id
agent_id
status
priority
created_at
```

Ticket status enum:

```txt
open
hea_sent
waiting_manager_action
manager_action_done
ready_to_close
closed
```

Priority enum:

```txt
low
medium
high
urgent
```

---

## 28. Ticket Status Meaning

```txt
open:
Ticket exists but initial handling is not recorded yet.

hea_sent:
Agent has sent/saved initial HEA response.

waiting_manager_action:
Ticket has been escalated and is waiting for manager action.

manager_action_done:
Manager has recorded action_taken and closure_message.

ready_to_close:
Ticket is ready for final agent response.

closed:
Agent has sent final response and ticket is closed.
```

For this phase:

```txt
manager_action_done can be treated as ready to close.
```

---

## 29. `action_requests` Table

Purpose:

```txt
Manager-level grouped issue / cluster.
```

Fields:

```txt
id
manager_id
reference_no
category
issue_key
grouping_key
cluster_label
status
issue_summary
action_taken
closure_message
raised_at
resolved_at
created_at
updated_at
```

Constraints:

```txt
id primary key
manager_id references users.id nullable
reference_no unique
category required
issue_key required
grouping_key required
status default open
raised_at required
created_at required
updated_at required
```

Indexes:

```txt
manager_id
reference_no
category
issue_key
grouping_key
status
raised_at
created_at
```

Action request status enum:

```txt
open
reviewing
action_taken
closed
```

Keep it simple for this phase.

Do not add `action_planned` unless the UI really needs it.

---

## 30. `action_request_complaints` Table

Purpose:

```txt
Join table linking grouped manager issue to complaints and tickets.
```

Fields:

```txt
id
action_request_id
complaint_id
ticket_id
agent_id
linked_at
```

Constraints:

```txt
id primary key
action_request_id references action_requests.id
complaint_id references complaints.id
ticket_id references tickets.id nullable
agent_id references users.id nullable
unique(action_request_id, complaint_id)
```

Indexes:

```txt
action_request_id
complaint_id
ticket_id
agent_id
linked_at
```

---

## 31. Update `quick_response_sessions.ticket_id`

Phase 2 may already have:

```txt
ticket_id nullable uuid
```

In Phase 3, add FK:

```txt
quick_response_sessions.ticket_id references tickets.id
```

Keep it nullable.

Reason:

```txt
Directly resolved complaints may never have tickets.
```

---

# Part E — Module Implementation

## 32. Module Structure

Create:

```txt
src/modules/tickets/
  tickets.dto.ts
  tickets.repository.ts
  tickets.service.ts
  tickets.routes.ts
  tickets.types.ts
```

Create:

```txt
src/modules/action-requests/
  action-requests.dto.ts
  action-requests.repository.ts
  action-requests.service.ts
  action-request-grouping.service.ts
  action-requests.routes.ts
  action-requests.types.ts
```

Update:

```txt
src/modules/quick-responses/quick-responses.service.ts
src/modules/quick-responses/quick-responses.routes.ts
src/modules/complaints/complaints.routes.ts
src/db/schema/relations.ts
src/db/schema/index.ts
src/app.ts
```

---

## 33. Repository Rules

Repositories only handle database access.

Repositories may:

```txt
insert
select
update
join
support transactions
```

Repositories must not decide:

```txt
whether a complaint should become a ticket
whether a ticket should be escalated
whether an action request should be created
whether a complaint is resolved
```

Those decisions belong in services.

---

## 34. Tickets Repository

Create:

```txt
src/modules/tickets/tickets.repository.ts
```

Functions:

```txt
createTicket(input, tx?)
findTicketById(id)
findTicketDetailById(id)
findTicketByComplaintId(complaintId)
findTickets(filters)
updateTicketStatus(id, status, tx?)
assignTicket(id, agentId, tx?)
closeTicket(id, closureMessage, tx?)
```

Filters:

```txt
status
priority
agentId
category
page
limit
search
```

---

## 35. Tickets Service

Create:

```txt
src/modules/tickets/tickets.service.ts
```

Functions:

```txt
createTicketFromComplaint(complaintId, agentId, input, tx?)
listTickets(filters, currentUser)
getTicketDetail(id, currentUser)
escalateTicket(ticketId, currentUser)
markManagerActionDone(ticketId, tx?)
closeTicketFromQuickResponse(ticketId, finalResponse, currentUser, tx?)
```

Main rules:

```txt
Only agent/admin can create or escalate tickets.
Manager can view tickets.
Manager does not directly edit tickets.
A complaint can have at most one ticket.
Ticket escalation must create/link an action_request.
```

---

## 36. Tickets Routes

Build first:

```txt
GET  /tickets
GET  /tickets/:id
POST /tickets/:id/escalate
```

Optional after main flow works:

```txt
PATCH /tickets/:id/assign
PATCH /tickets/:id/status
```

Role access:

```txt
GET /tickets                agent, manager, admin
GET /tickets/:id            agent, manager, admin
POST /tickets/:id/escalate  agent, admin
```

---

## 37. Action Requests Repository

Create:

```txt
src/modules/action-requests/action-requests.repository.ts
```

Functions:

```txt
createActionRequest(input, tx?)
findActionRequestById(id)
findActionRequestDetailById(id)
findActionRequests(filters)
findActiveActionRequestByGroupingKey(groupingKey, withinDays, tx?)
linkComplaintToActionRequest(actionRequestId, complaintId, ticketId, agentId, tx?)
findLinkedComplaints(actionRequestId)
updateActionRequest(id, input, tx?)
updateLinkedTicketsStatus(actionRequestId, status, tx?)
allLinkedTicketsClosed(actionRequestId, tx?)
```

---

## 38. Action Requests Service

Create:

```txt
src/modules/action-requests/action-requests.service.ts
```

Functions:

```txt
createOrFindActionRequestForTicket(ticket, complaint, currentUser, tx?)
listActionRequests(filters, currentUser)
getActionRequestDetail(id, currentUser)
recordTakeAction(actionRequestId, input, currentUser)
closeActionRequestIfAllTicketsClosed(actionRequestId, tx?)
```

Core grouping rule:

```txt
Detect issue_key.
Build grouping_key.
Find open/reviewing action_request with same grouping_key inside time window.
If found, link complaint/ticket.
If not found, create new action_request and link complaint/ticket.
```

---

## 39. Action Request Grouping Service

Create:

```txt
src/modules/action-requests/action-request-grouping.service.ts
```

Functions:

```txt
detectIssueKey(category, complaintText)
buildGroupingKey(category, issueKey)
getGroupingWindowDays(category)
makeClusterLabel(category, issueKey)
makeIssueSummary(complaint)
```

This file is intentionally simple.

Later, AI/ML/embedding logic can replace or enrich this service without changing the rest of the workflow.

---

## 40. Action Requests Routes

Build:

```txt
GET   /action-requests
GET   /action-requests/:id
PATCH /action-requests/:id/take-action
```

Optional after main flow works:

```txt
PATCH /action-requests/:id/assign
PATCH /action-requests/:id/status
```

Role access:

```txt
GET /action-requests                    manager, admin
GET /action-requests/:id                manager, admin
PATCH /action-requests/:id/take-action  manager, admin
```

---

# Part F — Quick Response Wiring

## 41. Update `POST /quick-responses`

Current behavior:

```txt
Creates new complaint.
Creates quick_response_session.
Maps outcome to complaint status.
```

New Phase 3 behavior:

```txt
If outcome = sent_resolved:
  create complaint
  create quick_response_session
  complaint.status = resolved
  ticket = null

If outcome = sent_hea_action:
  create complaint
  create ticket
  create quick_response_session linked to ticket
  complaint.status = waiting_action
  ticket.status = hea_sent
  requiresFollowUp = true

If outcome = copy_only:
  create complaint
  create quick_response_session
  complaint.status = submitted
  ticket = null
```

Important:

```txt
All inserts must happen in one transaction.
```

---

## 42. Add `POST /complaints/:id/quick-responses`

Purpose:

```txt
Create a quick_response_session for an existing complaint.
```

Use this for:

```txt
agent final closure
additional agent response
manual follow-up note
```

Request body:

```json
{
  "ticketId": "uuid",
  "response": {
    "responseTarget": "public_reply",
    "responseTone": "calm",
    "selectedHear": null,
    "selectedEmpathize": null,
    "selectedApologize": null,
    "selectedTakeAction": "Tindakan penyelesaian telah dilakukan oleh tim terkait.",
    "finalResponse": "Mohon maaf atas kendala yang terjadi. Tim kami telah melakukan pengecekan dan tindakan penyelesaian telah dilakukan.",
    "outcome": "sent_resolved"
  }
}
```

Rules:

```txt
If outcome = sent_resolved and ticket.status = manager_action_done:
  create quick_response_session
  complaint.status = resolved
  complaint.resolved_at = now
  ticket.status = closed
  ticket.closure_message = finalResponse
  ticket.closure_sent_at = now
```

If outcome = sent_resolved but ticket is still waiting_manager_action:

```txt
Reject with 400:
"Manager action has not been completed yet."
```

This prevents premature closure.

---

# Part G — Endpoint Summary

## 43. Existing Endpoints from Phase 2

```txt
POST  /quick-responses
GET   /complaints
GET   /complaints/:id
PATCH /complaints/:id
PATCH /complaints/:id/status
```

---

## 44. New Endpoints in Phase 3

```txt
POST /complaints/:id/quick-responses

GET  /tickets
GET  /tickets/:id
POST /tickets/:id/escalate

GET   /action-requests
GET   /action-requests/:id
PATCH /action-requests/:id/take-action
```

---

## 45. Endpoints Not Added Yet

```txt
GET /references
POST /references
GET /dashboard/*
GET /agent-performance/*
POST /public/complaints
GET /track/*
POST /quick-responses/preview
```

---

# Part H — Implementation Order

## 46. Recommended Build Order

Do it in this order:

```txt
1. Stabilization checklist
2. tickets schema + migration
3. action_requests schema + migration
4. action_request_complaints schema + migration
5. add FK quick_response_sessions.ticket_id -> tickets.id
6. tickets repository/service minimal
7. action_requests repository/service minimal
8. action_request_grouping.service.ts
9. wire sent_hea_action → create ticket
10. build GET /tickets and GET /tickets/:id
11. build POST /tickets/:id/escalate
12. build GET /action-requests and GET /action-requests/:id
13. build PATCH /action-requests/:id/take-action
14. add POST /complaints/:id/quick-responses for final closure
15. test full flow end-to-end
16. only then add optional ticket/status/assign endpoints
```

Important:

```txt
Do not start with generic CRUD.
Start with the flow.
```

---

# Part I — Seed Data

## 47. Seed Requirements

Create realistic flow seed data.

Minimum:

```txt
1 resolved complaint without ticket
1 waiting_action complaint with ticket.status = hea_sent
1 escalated ticket linked to action_request
1 action_request with 2 linked complaints/tickets
1 action_request with status = action_taken and linked tickets = manager_action_done
1 closed ticket with resolved complaint
```

Use realistic categories:

```txt
payment
delay
refund
cancellation
lost_item
app_error
facility
```

Example complaints:

```txt
Saldo terpotong tapi tiket tidak muncul.
Uang sudah kepotong tapi tiket belum keluar.
Kereta terlambat dan tidak ada pemberitahuan.
Pembatalan tiket gagal diproses.
Barang tertinggal di kereta.
Aplikasi error saat pembayaran.
```

Make sure at least two payment complaints produce the same grouping key:

```txt
payment:saldo_terpotong_tiket_tidak_muncul
```

This verifies clustering.

---

# Part J — Manual Testing

## 48. Smoke Test

```txt
[ ] Login as agent
[ ] Login as manager
[ ] Login as admin
[ ] Agent can POST /quick-responses
[ ] Manager cannot POST /quick-responses
[ ] Agent can see tickets
[ ] Manager can see action requests
```

---

## 49. Direct Resolution Test

```txt
[ ] POST /quick-responses outcome=sent_resolved
[ ] complaint.status = resolved
[ ] complaint.resolved_at is set
[ ] ticket = null
[ ] no ticket row is created
[ ] no action_request row is created
```

---

## 50. Follow-up Ticket Creation Test

```txt
[ ] POST /quick-responses outcome=sent_hea_action
[ ] complaint.status = waiting_action
[ ] ticket is created
[ ] ticket.status = hea_sent
[ ] quick_response_session.ticket_id = ticket.id
[ ] requiresFollowUp = true
```

---

## 51. Ticket Escalation Test

```txt
[ ] POST /tickets/:id/escalate
[ ] ticket.status = waiting_manager_action
[ ] issue_key is detected
[ ] grouping_key is created
[ ] action_request is created or reused
[ ] action_request_complaints row exists
```

---

## 52. Cluster Grouping Test

```txt
[ ] Escalate ticket with complaint: "Saldo terpotong tapi tiket tidak muncul"
[ ] Escalate another ticket with complaint: "Uang kepotong tapi tiket belum keluar"
[ ] Both produce issue_key = saldo_terpotong_tiket_tidak_muncul
[ ] Both produce grouping_key = payment:saldo_terpotong_tiket_tidak_muncul
[ ] Both are linked to the same action_request
```

---

## 53. Cluster Separation Test

```txt
[ ] Escalate payment ticket about refund delay
[ ] It should not join saldo_terpotong_tiket_tidak_muncul cluster
[ ] It should use issue_key = refund_belum_masuk or payment_general
[ ] It should create or join a different action_request
```

---

## 54. Manager Take Action Test

```txt
[ ] PATCH /action-requests/:id/take-action
[ ] action_request.status = action_taken
[ ] action_request.action_taken is saved
[ ] action_request.closure_message is saved
[ ] linked tickets.status = manager_action_done
[ ] complaint.status is still waiting_action
```

---

## 55. Final Closure Test

```txt
[ ] POST /complaints/:id/quick-responses outcome=sent_resolved with ticketId
[ ] quick_response_session is created
[ ] complaint.status = resolved
[ ] complaint.resolved_at is set
[ ] ticket.status = closed
[ ] ticket.closure_message is saved
[ ] ticket.closure_sent_at is set
```

---

## 56. Premature Closure Prevention Test

```txt
[ ] Try final closure while ticket.status = waiting_manager_action
[ ] API returns 400
[ ] complaint is not resolved
[ ] ticket is not closed
```

---

# Part K — Acceptance Criteria

## 57. Phase 3 Is Done When

```txt
Phase 1 and Phase 2 flows are verified.
sent_resolved does not create a ticket.
sent_hea_action creates a ticket.
Ticket escalation detects issue_key and grouping_key.
Ticket escalation creates or reuses an action_request.
Same-category and same-issue tickets inside time window group into the same action_request.
Different issue_key creates or uses a different action_request.
Manager take-action updates action_request and linked tickets.
Manager take-action does not resolve complaint directly.
Agent final closure resolves complaint and closes ticket.
All main flow endpoints are protected by role guards.
All multi-step writes use transactions.
References are not implemented yet.
Suggestion pipeline is not implemented yet.
AI/RAG is not implemented yet.
Dashboard/audit/events are not implemented yet.
```

---

## 58. What This Phase Must Not Build

```txt
reference_sources
reference_tags
reference_source_tags
quick_response_references
action_request_references
suggestion pipeline
quick response preview
AI/RAG
ticket_events
audit_logs
dashboard
agent_performance
public complaint submission
passenger tracking
```

---

# Final Phase 3 Summary

Phase 3 proves the main product flow:

```txt
Agent handles complaint
→ unresolved case becomes ticket
→ ticket enters grouped manager action
→ manager records action
→ agent sends closure
→ complaint is resolved
```

Manager clustering in this phase is:

```txt
category + issue_key + time_window
```

This is simple enough for early implementation, but future-proof enough to replace with smarter clustering later.

Everything else can wait.
