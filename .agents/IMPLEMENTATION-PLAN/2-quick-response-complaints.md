# plan.md

# Phase 2 — Complaint + Manual Quick Response Save Backend Plan

## 1. Goal

Implement the backend foundation for saving complaints from the Quick Response workspace.

In this phase, Quick Response is used as the main entry point for creating complaints.

The backend should support this flow:

```txt
Agent opens Quick Response workspace
↓
Agent inputs/pastes customer complaint
↓
Agent manually writes or edits response
↓
Agent saves the complaint and response
↓
Backend creates complaint
↓
Backend creates quick_response_session
↓
Backend stores the current complaint status
```

This phase does not generate suggestions automatically.

The backend only stores what the agent submits.

---

## 2. Phase Position

Previous phase:

```txt
Phase 1 — Auth
- users table
- seeded users
- POST /auth/login
- GET /auth/me
- Bearer JWT auth
```

Current phase:

```txt
Phase 2 — Complaint + Manual Quick Response Save
```

Future phases:

```txt
Phase 3 — References Foundation
Phase 4 — Suggestion Pipeline
Phase 5 — Follow-up Workflow
```

---

## 3. Tech Stack

```txt
Runtime: Bun
Framework: Elysia
Language: TypeScript
Database: PostgreSQL
ORM: Drizzle ORM
Migration: Drizzle Kit
Auth: Bearer JWT
```

---

## 4. Core Concept

This phase protects this separation:

```txt
Complaint = original customer issue
Quick Response Session = one agent response/action session for a complaint
```

The system should be able to store:

```txt
1. The original complaint text
2. The source/channel of the complaint
3. The agent who handled the response
4. The response text created by the agent
5. The outcome of the response
6. The complaint status after the response is saved
```

---

## 5. Scope Summary

Build:

```txt
complaints table
quick_response_sessions table

POST /quick-responses

GET /complaints
GET /complaints/:id
PATCH /complaints/:id
PATCH /complaints/:id/status
```

Do not build yet:

```txt
POST /quick-responses/preview
suggestion generation
reference search
reference scoring
HEA/HEAT auto builder
requiresManagerAction detection
tickets
action_requests
manager queue
RAG
AI response generation
```

---

# Scope Boundary

## 6. What This Phase Can Do

This phase can do:

```txt
1. Authenticated agent/admin can save a complaint from Quick Response.
2. Authenticated agent/admin can save a manual quick response session.
3. Backend can determine complaint status from quick response outcome.
4. Agent/manager/admin can list complaints.
5. Agent/manager/admin can view complaint detail.
6. Agent/admin can update complaint basic fields.
7. Agent/admin can update complaint status.
8. Backend generates reference_no and tracking_token for complaints.
```

---

## 7. What This Phase Cannot Do

This phase must not implement:

```txt
1. Do not generate response suggestions.
2. Do not implement quick response preview.
3. Do not search references.
4. Do not calculate reference relevance score.
5. Do not create quick_response_references.
6. Do not create reference_sources.
7. Do not create tickets.
8. Do not create action_requests.
9. Do not create action_request_complaints.
10. Do not build manager action queue.
11. Do not build public passenger complaint submission.
12. Do not build passenger tracking.
13. Do not build RAG or embedding search.
14. Do not build AI response generation.
15. Do not build agent performance metrics.
16. Do not build ticket_events yet.
```

---

## 8. Role Boundary

Allowed roles:

```txt
agent:
- can save quick response
- can list complaints
- can view complaint detail
- can update complaint
- can update complaint status

admin:
- can save quick response
- can list complaints
- can view complaint detail
- can update complaint
- can update complaint status

manager:
- can list complaints
- can view complaint detail
- cannot save quick response
- cannot update complaint in this phase unless explicitly allowed later
```

Reason:

```txt
Quick Response is an agent workspace.
Manager workflow starts in a later phase.
```

---

## 9. Endpoint Boundary

Build only these endpoints:

```txt
POST  /quick-responses

GET   /complaints
GET   /complaints/:id
PATCH /complaints/:id
PATCH /complaints/:id/status
```

Do not build yet:

```txt
POST /quick-responses/preview
GET  /references
GET  /references/:id
POST /tickets
GET  /tickets
POST /action-requests
GET  /action-requests
PATCH /action-requests/:id
POST /complaints/public
GET  /track/:referenceNo
```

---

## 10. Data Write Boundary

`POST /quick-responses` can write only to:

```txt
complaints
quick_response_sessions
```

It must not write to:

```txt
quick_response_references
reference_sources
reference_tags
reference_source_tags
tickets
action_requests
action_request_complaints
action_request_references
ticket_events
agent_performance
```

Complaint update endpoints can write only to:

```txt
complaints
```

Complaint read endpoints can read from:

```txt
complaints
quick_response_sessions
users
```

---

# Database Implementation

## 11. Tables for This Phase

Implement these tables:

```txt
complaints
quick_response_sessions
```

Reuse existing table from auth phase:

```txt
users
```

---

## 12. Schema Folder Structure

Create or update:

```txt
src/db/schema/
  complaints.schema.ts
  quick-response.schema.ts
  index.ts
  relations.ts
```

---

## 13. Schema Build Order

Build in this order:

```txt
1. users
2. complaints
3. quick_response_sessions
```

---

## 14. `complaints.schema.ts`

Purpose:

```txt
Stores original customer complaints created from the Quick Response workspace.
```

Fields:

```txt
id
reference_no
tracking_token
source
source_handle
source_url
complainer_name
complainer_contact
category
complaint_text
status
submitted_at
resolved_at
created_at
updated_at
```

Enums:

```txt
complaint_source:
- web_form
- twitter
- instagram
- facebook
- google_play
- app_store
- other
```

```txt
complaint_category:
- delay
- refund
- cancellation
- lost_item
- facility
- payment
- account
- app_error
- other
```

```txt
complaint_status:
- submitted
- waiting_action
- resolved
- closed
```

Important constraints:

```txt
id primary key
reference_no unique
tracking_token unique
complaint_text required
category required
status default submitted
submitted_at required
created_at required
updated_at required
```

Indexes:

```txt
reference_no
tracking_token
source
category
status
submitted_at
created_at
```

---

## 15. Complaint Status Meaning

```txt
submitted:
Complaint has been saved, but no follow-up workflow is active yet.

waiting_action:
Agent has sent/saved an initial response, but concrete Take Action is still needed later.

resolved:
Complaint has been resolved from the agent response.

closed:
Complaint is administratively closed.
```

In Phase 2, status can be changed manually through status update endpoint.

Automatic status mapping only happens when saving Quick Response.

---

## 16. Reference Number Helper

Create:

```txt
src/shared/utils/reference-number.ts
```

Purpose:

```txt
Generate readable complaint reference number.
```

Format:

```txt
ACC-YYYYMMDD-RANDOM
```

Example:

```txt
ACC-20260615-A7K2
```

Implementation rule:

```txt
Use current date.
Use short random uppercase suffix.
Check uniqueness before insert if possible.
```

For v1, random suffix is acceptable.

Later, replace with database sequence.

---

## 17. Tracking Token Helper

Create:

```txt
src/shared/utils/tracking-token.ts
```

Purpose:

```txt
Generate public-safe tracking token for future tracking page.
```

Example:

```txt
trk_8f7a2c91c1e14c2a9a
```

This is not used heavily in Phase 2, but should be generated when complaint is created.

---

## 18. `quick-response.schema.ts`

Purpose:

```txt
Stores one manual response session created by an agent.
```

Fields:

```txt
id
agent_id
complaint_id
ticket_id
source_channel
source_handle
response_tone
response_target
selected_hear
selected_empathize
selected_apologize
selected_take_action
final_response
outcome
created_at
updated_at
```

For Phase 2:

```txt
ticket_id is nullable.
ticket_id should be uuid without FK for now.
```

Reason:

```txt
Tickets are not implemented yet.
The FK can be added in Phase 5 when tickets table exists.
```

Enums:

```txt
response_target:
- public_reply
- dm
- app_review
- internal_note
```

```txt
quick_response_outcome:
- sent_resolved
- sent_hea_action
- copy_only
```

Do not include these outcomes yet:

```txt
saved_ticket
escalated
```

Reason:

```txt
Ticket and escalation workflows are not implemented in Phase 2.
```

Important constraints:

```txt
id primary key
agent_id references users.id
complaint_id references complaints.id
outcome required
final_response nullable
created_at required
updated_at required
```

Indexes:

```txt
agent_id
complaint_id
ticket_id
outcome
created_at
```

---

## 19. Quick Response Outcome Meaning

```txt
sent_resolved:
Agent saved/sent a complete response and complaint can be marked resolved.

sent_hea_action:
Agent saved/sent an initial response, but follow-up action is still needed.

copy_only:
Agent only saved/copied the response without official resolution or follow-up workflow.
```

Status mapping:

```txt
outcome = sent_resolved
→ complaints.status = resolved
→ complaints.resolved_at = now

outcome = sent_hea_action
→ complaints.status = waiting_action
→ complaints.resolved_at = null

outcome = copy_only
→ complaints.status = submitted
→ complaints.resolved_at = null
```

---

## 20. Schema Export

Update:

```txt
src/db/schema/index.ts
```

Export:

```ts
export * from "./users.schema";
export * from "./complaints.schema";
export * from "./quick-response.schema";
export * from "./relations";
```

---

## 21. Relations

Update:

```txt
src/db/schema/relations.ts
```

Define relations:

```txt
users → quick_response_sessions

complaints → quick_response_sessions

quick_response_sessions → users
quick_response_sessions → complaints
```

Relation details:

```txt
users.id = quick_response_sessions.agent_id
complaints.id = quick_response_sessions.complaint_id
```

---

# Module Implementation

## 22. Module Folder Structure

Create:

```txt
src/modules/
  complaints/
    complaints.dto.ts
    complaints.repository.ts
    complaints.service.ts
    complaints.routes.ts
    complaints.types.ts

  quick-responses/
    quick-responses.dto.ts
    quick-responses.repository.ts
    quick-responses.service.ts
    quick-responses.routes.ts
    quick-responses.types.ts
```

Shared utilities:

```txt
src/shared/
  utils/
    reference-number.ts
    tracking-token.ts
    normalize-text.ts

  responses/
    api-response.ts

  errors/
    app-error.ts
```

If shared response/error helpers already exist from auth phase, reuse them.

---

# Complaints Module

## 23. Complaints Repository

Create:

```txt
src/modules/complaints/complaints.repository.ts
```

Functions:

```txt
createComplaint(input, tx?)
findComplaints(filters)
findComplaintById(id)
findComplaintDetailById(id)
updateComplaint(id, input)
updateComplaintStatus(id, status)
```

Notes:

```txt
Repository handles database queries only.
Repository should not decide business status mapping.
Repository should support transaction object for createComplaint.
```

---

## 24. Complaints Service

Create:

```txt
src/modules/complaints/complaints.service.ts
```

Functions:

```txt
createComplaint(input)
listComplaints(filters)
getComplaintDetail(id)
updateComplaint(id, input, currentUser)
updateComplaintStatus(id, input, currentUser)
```

Rules:

```txt
Service validates business rules.
Service generates reference_no and tracking_token.
Service controls which role can update complaint.
Service never returns tracking_token unless needed for internal detail.
```

---

## 25. Complaints DTO

Create:

```txt
src/modules/complaints/complaints.dto.ts
```

Validation for creating/updating complaint:

```txt
complaintText min length 10
category must be valid complaint_category
source must be valid complaint_source if provided
sourceHandle optional string
sourceUrl optional string
complainerName optional string
complainerContact optional string
```

Validation for status update:

```txt
status must be:
- submitted
- waiting_action
- resolved
- closed
```

---

## 26. Complaint Read Routes

Create:

```txt
GET /complaints
GET /complaints/:id
```

Protected:

```txt
requireAuth
```

Allowed roles:

```txt
agent
manager
admin
```

---

## 27. `GET /complaints`

Query params:

```txt
status
category
source
limit
page
search
```

Default:

```txt
limit = 20
page = 1
```

Search behavior:

```txt
Search in complaint_text, reference_no, source_handle, complainer_name.
```

Response should include:

```txt
id
referenceNo
source
sourceHandle
category
complaintText
status
submittedAt
resolvedAt
createdAt
updatedAt
```

Example response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "referenceNo": "ACC-20260615-A7K2",
        "source": "app_store",
        "sourceHandle": "user123",
        "category": "delay",
        "complaintText": "Kereta saya terlambat 2 jam...",
        "status": "waiting_action",
        "submittedAt": "2026-06-15T10:00:00.000Z",
        "resolvedAt": null,
        "createdAt": "2026-06-15T10:00:00.000Z",
        "updatedAt": "2026-06-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
}
```

---

## 28. `GET /complaints/:id`

Response should include:

```txt
complaint
quickResponseSessions
```

Complaint object:

```txt
id
referenceNo
trackingToken
source
sourceHandle
sourceUrl
complainerName
complainerContact
category
complaintText
status
submittedAt
resolvedAt
createdAt
updatedAt
```

Quick response session object:

```txt
id
agent
sourceChannel
sourceHandle
responseTone
responseTarget
selectedHear
selectedEmpathize
selectedApologize
selectedTakeAction
finalResponse
outcome
createdAt
updatedAt
```

Example response:

```json
{
  "success": true,
  "data": {
    "complaint": {
      "id": "uuid",
      "referenceNo": "ACC-20260615-A7K2",
      "source": "app_store",
      "sourceHandle": "user123",
      "sourceUrl": null,
      "complainerName": null,
      "complainerContact": null,
      "category": "delay",
      "complaintText": "Kereta saya terlambat 2 jam...",
      "status": "waiting_action",
      "submittedAt": "2026-06-15T10:00:00.000Z",
      "resolvedAt": null,
      "createdAt": "2026-06-15T10:00:00.000Z",
      "updatedAt": "2026-06-15T10:00:00.000Z"
    },
    "quickResponseSessions": [
      {
        "id": "uuid",
        "agent": {
          "id": "uuid",
          "name": "Agent Demo",
          "email": "agent1@access.test"
        },
        "responseTarget": "app_review",
        "responseTone": "calm",
        "selectedHear": "Kami memahami keluhan Anda...",
        "selectedEmpathize": "Kami mengerti kondisi ini...",
        "selectedApologize": "Mohon maaf atas ketidaknyamanan...",
        "selectedTakeAction": null,
        "finalResponse": "Kami memahami keluhan Anda...",
        "outcome": "sent_hea_action",
        "createdAt": "2026-06-15T10:00:00.000Z",
        "updatedAt": "2026-06-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 29. Complaint Update Routes

Create:

```txt
PATCH /complaints/:id
PATCH /complaints/:id/status
```

Protected:

```txt
requireAuth
```

Allowed roles:

```txt
agent
admin
```

Manager cannot update complaints in Phase 2.

---

## 30. `PATCH /complaints/:id`

Purpose:

```txt
Update basic complaint information.
```

Allowed fields:

```txt
source
sourceHandle
sourceUrl
complainerName
complainerContact
category
complaintText
```

Not allowed fields:

```txt
id
referenceNo
trackingToken
status
submittedAt
resolvedAt
createdAt
updatedAt
```

Example request:

```json
{
  "category": "delay",
  "complaintText": "Kereta terlambat 2 jam dan tidak ada pemberitahuan dari aplikasi."
}
```

---

## 31. `PATCH /complaints/:id/status`

Purpose:

```txt
Update complaint status manually.
```

Allowed fields:

```txt
status
```

Example request:

```json
{
  "status": "resolved"
}
```

Rules:

```txt
If status becomes resolved:
- set resolved_at = now if empty

If status changes from resolved to non-resolved:
- set resolved_at = null

If status becomes closed:
- keep resolved_at if already resolved
- if resolved_at is empty, set resolved_at = now
```

---

# Quick Responses Module

## 32. Quick Responses Repository

Create:

```txt
src/modules/quick-responses/quick-responses.repository.ts
```

Functions:

```txt
createQuickResponseSession(input, tx?)
findSessionsByComplaintId(complaintId)
```

Notes:

```txt
Repository handles DB insert/query only.
Repository should support transaction object.
```

---

## 33. Quick Responses Service

Create:

```txt
src/modules/quick-responses/quick-responses.service.ts
```

Functions:

```txt
saveQuickResponse(input, currentUser)
```

Rules:

```txt
Only agent/admin can save Quick Response.
Save uses database transaction.
Save creates complaint.
Save creates quick_response_session.
Save maps quick response outcome to complaint status.
Save does not create ticket.
Save does not create action_request.
Save does not generate suggestions.
Save does not search references.
```

---

## 34. Quick Responses DTO

Create:

```txt
src/modules/quick-responses/quick-responses.dto.ts
```

Request validation:

```txt
complaint.complaintText min length 10
complaint.category enum
complaint.source enum optional

response.responseTarget enum
response.responseTone optional string
response.selectedHear optional string
response.selectedEmpathize optional string
response.selectedApologize optional string
response.selectedTakeAction optional string nullable
response.finalResponse optional string nullable
response.outcome enum
```

Allowed outcome values:

```txt
sent_resolved
sent_hea_action
copy_only
```

Validation rule:

```txt
If outcome = sent_resolved:
- finalResponse should not be empty
- selectedTakeAction should ideally not be empty

If outcome = sent_hea_action:
- finalResponse should not be empty

If outcome = copy_only:
- finalResponse can be empty or filled
```

For v1, enforce only minimum required validation.

Stricter rules can be added later.

---

## 35. Save Quick Response Route

Create:

```txt
POST /quick-responses
```

Protected:

```txt
requireAuth
```

Allowed roles:

```txt
agent
admin
```

Manager is not allowed.

---

## 36. Save Quick Response Request Body

Example request:

```json
{
  "complaint": {
    "complaintText": "Kereta saya terlambat 2 jam dan tidak ada pemberitahuan.",
    "source": "app_store",
    "sourceHandle": "user123",
    "sourceUrl": "https://example.com/review/123",
    "complainerName": "User App Store",
    "complainerContact": null,
    "category": "delay"
  },
  "response": {
    "responseTarget": "app_review",
    "responseTone": "calm",
    "selectedHear": "Kami memahami keluhan Anda terkait keterlambatan perjalanan.",
    "selectedEmpathize": "Kami mengerti kondisi ini dapat mengganggu rencana perjalanan Anda.",
    "selectedApologize": "Mohon maaf atas ketidaknyamanan yang terjadi.",
    "selectedTakeAction": null,
    "finalResponse": "Kami memahami keluhan Anda terkait keterlambatan perjalanan. Mohon maaf atas ketidaknyamanan yang terjadi.",
    "outcome": "sent_hea_action"
  }
}
```

---

## 37. Save Quick Response Behavior

This endpoint must use a database transaction.

Transaction steps:

```txt
1. Validate current user role.
2. Determine complaint status from response outcome.
3. Generate reference_no.
4. Generate tracking_token.
5. Create complaint.
6. Create quick_response_session.
7. Return created complaint and quick response session.
```

Complaint status rule:

```txt
if outcome = sent_resolved:
  complaints.status = resolved
  complaints.resolved_at = now

if outcome = sent_hea_action:
  complaints.status = waiting_action
  complaints.resolved_at = null

if outcome = copy_only:
  complaints.status = submitted
  complaints.resolved_at = null
```

Temporary rule:

```txt
In Phase 2, sent_hea_action does not create ticket/action request yet.
Return requiresFollowUp = true.
```

---

## 38. Save Quick Response Response

Example response:

```json
{
  "success": true,
  "message": "Quick response saved",
  "data": {
    "complaint": {
      "id": "uuid",
      "referenceNo": "ACC-20260615-A7K2",
      "status": "waiting_action",
      "category": "delay",
      "complaintText": "Kereta saya terlambat 2 jam dan tidak ada pemberitahuan.",
      "submittedAt": "2026-06-15T10:00:00.000Z",
      "resolvedAt": null
    },
    "quickResponseSession": {
      "id": "uuid",
      "outcome": "sent_hea_action",
      "finalResponse": "Kami memahami keluhan Anda...",
      "createdAt": "2026-06-15T10:00:00.000Z"
    },
    "requiresFollowUp": true
  }
}
```

`requiresFollowUp` value:

```txt
outcome = sent_hea_action → true
outcome = sent_resolved → false
outcome = copy_only → false
```

---

# App Registration

## 39. Register Routes

Register routes in:

```txt
src/app.ts
```

Mount:

```txt
complaintsRoutes
quickResponsesRoutes
```

Expected endpoints:

```txt
POST  /quick-responses

GET   /complaints
GET   /complaints/:id
PATCH /complaints/:id
PATCH /complaints/:id/status
```

No `/api/v1` prefix for now.

---

# Seed Data

## 40. Seeder Files

Create or update:

```txt
src/db/seed/complaints.seed.ts
src/db/seed/quick-responses.seed.ts
```

Seeder order:

```txt
1. users
2. complaints
3. quick_response_sessions
```

---

## 41. Complaints Seed

Seed several complaints:

```txt
Saldo saya terpotong tapi tiket tidak muncul.
Kereta terlambat dan tidak ada pemberitahuan.
Saya tidak bisa membatalkan tiket dari aplikasi.
Barang saya tertinggal di kereta.
Aplikasi error saat proses pembayaran.
Fasilitas stasiun tidak berfungsi dengan baik.
```

Use varied categories:

```txt
payment
delay
cancellation
lost_item
app_error
facility
refund
```

Use varied statuses:

```txt
submitted
waiting_action
resolved
closed
```

---

## 42. Quick Response Sessions Seed

Seed simple sessions linked to some complaints.

Examples:

```txt
sent_resolved:
Complaint about known app error resolved directly.

sent_hea_action:
Complaint about delay requiring further action.

copy_only:
Complaint response drafted/copied but not resolved.
```

Each session should be linked to:

```txt
agent_id
complaint_id
```

---

# Manual Testing

## 43. Generate and Apply Migration

```bash
bun run db:generate
bun run db:migrate
```

Or during early development:

```bash
bun run db:push
```

---

## 44. Run Seed

```bash
bun run db:seed
```

---

## 45. Login as Agent

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent1@access.test",
    "password": "password123"
  }'
```

Copy token.

---

## 46. Test Save Quick Response

```bash
curl -X POST http://localhost:3001/quick-responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "complaint": {
      "complaintText": "Kereta saya terlambat 2 jam dan tidak ada pemberitahuan.",
      "source": "app_store",
      "sourceHandle": "user123",
      "category": "delay"
    },
    "response": {
      "responseTarget": "app_review",
      "responseTone": "calm",
      "selectedHear": "Kami memahami keluhan Anda terkait keterlambatan perjalanan.",
      "selectedEmpathize": "Kami mengerti kondisi ini dapat mengganggu rencana perjalanan Anda.",
      "selectedApologize": "Mohon maaf atas ketidaknyamanan yang terjadi.",
      "selectedTakeAction": null,
      "finalResponse": "Kami memahami keluhan Anda terkait keterlambatan perjalanan. Mohon maaf atas ketidaknyamanan yang terjadi.",
      "outcome": "sent_hea_action"
    }
  }'
```

Expected:

```txt
Creates complaint.
Creates quick_response_session.
Complaint status = waiting_action.
requiresFollowUp = true.
```

---

## 47. Test List Complaints

```bash
curl "http://localhost:3001/complaints?status=waiting_action&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

Expected:

```txt
Returns paginated complaint list.
```

---

## 48. Test Complaint Detail

```bash
curl http://localhost:3001/complaints/<complaint_id> \
  -H "Authorization: Bearer <token>"
```

Expected:

```txt
Returns complaint.
Returns related quick_response_sessions.
```

---

## 49. Test Update Complaint

```bash
curl -X PATCH http://localhost:3001/complaints/<complaint_id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "category": "delay",
    "complaintText": "Kereta terlambat 2 jam dan tidak ada pemberitahuan dari aplikasi."
  }'
```

Expected:

```txt
Updates complaint basic fields.
Does not change status.
```

---

## 50. Test Update Complaint Status

```bash
curl -X PATCH http://localhost:3001/complaints/<complaint_id>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "status": "resolved"
  }'
```

Expected:

```txt
Updates complaint.status = resolved.
Sets resolved_at if empty.
```

---

# Acceptance Criteria

## 51. Database Acceptance

This phase is done when these tables exist:

```txt
complaints
quick_response_sessions
```

These tables must not exist yet unless already created intentionally for a later migration:

```txt
reference_sources
reference_tags
reference_source_tags
quick_response_references
tickets
action_requests
action_request_complaints
action_request_references
ticket_events
agent_performance
```

---

## 52. API Acceptance

This phase is done when:

```txt
Agent can save complaint from Quick Response.
Save Quick Response creates complaint.
Save Quick Response creates quick_response_session.
Save uses database transaction.
sent_resolved sets complaint.status = resolved.
sent_hea_action sets complaint.status = waiting_action.
copy_only sets complaint.status = submitted.

Agent/manager/admin can list complaints.
Agent/manager/admin can view complaint detail.
Agent/admin can update complaint basic fields.
Agent/admin can update complaint status.
Manager cannot save quick response.
Password hash/user sensitive data is never returned.
```

---

## 53. Boundary Acceptance

This phase is only accepted if:

```txt
No suggestion pipeline is implemented.
No preview endpoint is implemented.
No reference search is implemented.
No quick_response_references are implemented.
No ticket is created.
No action_request is created.
No action_request_complaints row is created.
No manager action queue logic is implemented.
No public complaint form endpoint is implemented.
No passenger tracking endpoint is implemented.
No AI/RAG table is implemented.
```

---

# What Not To Build Yet

Do not build these yet:

```txt
POST /quick-responses/preview
reference_sources
reference_tags
reference_source_tags
quick_response_references
tickets
action_requests
action_request_complaints
action_request_references
ticket_events
agent_performance
RAG
AI response generation
public complaint submit page
passenger tracking endpoint
```

Reason:

```txt
This phase should only persist complaint and manual quick response data.
Suggestion and reference logic require a more complex pipeline and will be added later.
```

---

# Next Phase Preview

After this phase, continue to:

```txt
Phase 3 — References Foundation
```

Phase 3 will add:

```txt
reference_sources
reference_tags
reference_source_tags
reference search
```

After that:

```txt
Phase 4 — Suggestion Pipeline
```

Phase 4 will add:

```txt
POST /quick-responses/preview
reference search scoring
suggested response builder
requiresManagerAction detection
quick_response_references
```

Then:

```txt
Phase 5 — Follow-up Workflow
```

Phase 5 will add:

```txt
tickets
action_requests
action_request_complaints
manager queue
```

---

# Final Notes

The main backend flow for this phase is:

```txt
Quick Response Save:
input complaint + manual response
→ create complaint
→ create quick_response_session
→ return saved result
```

The clearest implementation rule is:

```txt
Save data only.
Do not suggest.
Do not search references.
Do not create follow-up workflow yet.
```
