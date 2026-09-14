# ACCESS Backend Architecture Guide

## 1. Overview

ACCESS is a human-centered customer support workflow system for handling transportation-related complaints.

The backend is designed to support agents and managers in processing complaints, preparing responses, coordinating follow-up actions, and tracking resolution history.

The system may later include reference search, response suggestions, RAG, complaint clustering, or AI assistance. However, the core backend must remain usable without AI.

Core principle:

```txt
Humans decide.
The system records, organizes, guides, and supports.
AI may assist later, but must not own the workflow.
```

---

## 2. Purpose of This Document

This document defines the stable backend architecture rules for ACCESS.

It should explain:

```txt
project structure
module boundaries
domain ownership
dependency direction
database responsibility
API conventions
authorization model
workflow invariants
extension rules
```

This document should not be used as a phase-by-phase implementation plan.

Implementation phases may change depending on development progress. Those should be documented separately in:

```txt
plan.md
phase-*.md
implementation notes
```

Architecture should stay stable even when the implementation order changes.

---

## 3. Architecture Goals

The backend should be:

```txt
modular
business-process-first
easy to extend
safe for future AI/RAG integration
clear for contributors
clear for coding agents
not over-engineered too early
```

The backend should protect these rules:

```txt
Complaint does not automatically mean ticket.
Ticket does not mean manager action.
Manager action request is grouped, not one-by-one ticket reply.
Reference source is broader than document.
AI is optional and replaceable.
Business workflow must survive AI failure.
```

---

## 4. Technology Stack

Current backend stack:

```txt
Runtime: Bun
Framework: Elysia
Language: TypeScript
Database: PostgreSQL
ORM: Drizzle ORM
Migration: Drizzle Kit
Validation: Elysia TypeBox / t, or Zod if already used consistently
API Style: REST
Auth: Bearer JWT
```

Optional future stack:

```txt
ML / AI Service: FastAPI
Queue: Redis-based queue
RAG Storage: pgvector or external vector database
Background Jobs: worker service
```

The core backend must not require these to work:

```txt
AI service
ML service
queue worker
vector database
embedding job
RAG retrieval
```

---

## 5. Architectural Style

Use feature-based architecture.

Avoid organizing the project only by technical layers such as:

```txt
controllers/
services/
repositories/
```

Instead, organize by business capability:

```txt
modules/
  auth/
  users/
  complaints/
  quick-responses/
  references/
  tickets/
  action-requests/
  dashboard/
  audit/
  agent-performance/
  ai/
  holidays/
```

Each module owns its related files:

```txt
routes
dto
service
repository
types
```

Recommended module structure:

```txt
modules/
  complaints/
    complaints.routes.ts
    complaints.service.ts
    complaints.repository.ts
    complaints.dto.ts
    complaints.types.ts
```

Use plural module names when the route/resource is plural:

```txt
quick-responses/
references/
action-requests/
```

---

## 6. Main Folder Structure

Recommended backend structure:

```txt
src/
  app.ts
  server.ts

  config/
    env.ts
    cors.ts

  db/
    index.ts
    schema/
      index.ts
      users.schema.ts
      complaints.schema.ts
      quick-response.schema.ts
      references.schema.ts
      tickets.schema.ts
      action-requests.schema.ts
      ticket-events.schema.ts
      audit-logs.schema.ts
      agent-performance.schema.ts
      social-complaints.schema.ts
      relations.ts

    seed/
      index.ts
      users.seed.ts
      complaints.seed.ts
      quick-responses.seed.ts
      references.seed.ts
      tickets.seed.ts
      action-requests.seed.ts
      ticket-events.seed.ts
      agent-performance.seed.ts
      holidays.seed.ts
      social-complaints.seed.ts

  plugins/
    auth.plugin.ts
    error.plugin.ts
    logger.plugin.ts
    response.plugin.ts

  integrations/
    ai/
    apify/
    embeddings/
    supabase/

  shared/
    constants/
    errors/
    responses/
    types/
    utils/
      reference-number.ts
      tracking-token.ts
      normalize-text.ts

  modules/
    auth/
    users/
    complaints/
    quick-responses/
    references/
    tickets/
    action-requests/
    dashboard/
    audit/
    agent-performance/
    ai/
    holidays/
    social-complaints/
```

Important rule:

```txt
Do not create a long-term documents module.
Use references module instead.
```

Reason:

```txt
The support knowledge source is not always a document.
It can be SOP, FAQ, policy, template, known issue, previous action, uploaded file, external link, or internal note.
```

---

## 7. Layer Responsibilities

Each module should follow this responsibility split:

```txt
routes       → HTTP request/response layer
dto          → request/query/params validation
service      → business rules and workflow decisions
repository   → database access only
types        → domain-facing TypeScript types
db/schema    → Drizzle table definitions
```

---

### 7.1 Routes

Routes should be thin.

Routes should:

```txt
validate request input
read authenticated user
call the appropriate service
return standardized response
```

Routes should not:

```txt
perform direct database queries
contain complex business rules
duplicate workflow decisions
manually orchestrate unrelated modules
```

---

### 7.2 DTOs

DTOs define external API contracts.

DTO files may contain:

```txt
request body schema
query schema
params schema
response shape if useful
```

DTOs protect services from raw, invalid, or incomplete input.

---

### 7.3 Services

Services own business rules.

Services should decide:

```txt
what status should be set?
can this user perform this action?
should this response resolve the complaint?
should this complaint require follow-up?
should this complaint become a ticket?
should this complaint be linked to manager action?
what status transition is valid?
```

Services may call repositories and other services when needed.

For cross-module workflows, prefer a clear orchestration service or a top-level service method rather than spreading workflow logic across many route files.

---

### 7.4 Repositories

Repositories own database access.

Repositories should:

```txt
select data
insert data
update data
delete/archive data
perform joins
support transactions when needed
```

Repositories should not contain business decisions.

Bad repository responsibility:

```txt
deciding whether a complaint should become a ticket
deciding whether a manager action is required
deciding whether response outcome means resolved
```

Good repository responsibility:

```txt
insert complaint
find complaint by id
update complaint status
find quick response sessions by complaint id
```

---

### 7.5 Types

Type files define domain-facing TypeScript types.

Types should describe how a module understands its own data internally.

Types should not depend on HTTP request details.

---

## 8. Core Domain Model

The backend must preserve this separation:

```txt
Complaint
  original customer/passenger issue

Quick Response Session
  one agent response/action session for a complaint

Reference Source
  reusable internal source of support information

Quick Response Reference
  reference shown or used in a quick response session

Ticket
  internal agent work item when follow-up is needed

Action Request
  manager-level grouped issue

Action Request Complaint
  join table connecting manager action request to complaints/tickets

Action Request Reference
  evidence/source attached to manager action

Ticket Event
  timeline/history for a ticket

Audit Log
  system accountability record

Agent Performance
  derived metric snapshot

AI
  optional future assistant
```

This is the most important architecture rule in the project.

---

## 9. Domain Invariants

These rules should remain true regardless of implementation order.

### Complaint

```txt
Complaint is the original customer issue.
Complaint can exist without ticket.
Complaint can have many quick response sessions.
Complaint may later become a ticket.
Complaint may later be linked to an action request.
Complaint can be resolved directly if enough information/action exists.
```

---

### Quick Response Session

```txt
Quick Response Session must belong to one complaint.
Quick Response Session must belong to one agent.
Quick Response Session may optionally belong to one ticket.
Quick Response Session stores what the agent wrote/saved/sent.
Quick Response Session does not automatically mean the case is resolved.
```

---

### Ticket

```txt
Ticket is an internal agent work item.
Not every complaint should become a ticket.
Ticket exists when a complaint needs internal follow-up.
Ticket belongs to one complaint.
Ticket may have many quick response sessions.
Ticket status should represent internal operational progress.
```

---

### Action Request

```txt
Action Request is a manager-level grouped issue.
Managers should handle grouped problems, not individual ticket replies one by one.
One action request can cover many complaints.
One action request can involve many tickets.
Action request stores manager action_taken and closure_message.
```

---

### Reference Source

```txt
Reference Source is a reusable source of information.
Reference Source is broader than document.
Reference Source can support agent response or manager action.
Reference Source can be searched or attached later.
```

Examples:

```txt
SOP
FAQ
policy
guide
template
known_issue
external_link
uploaded_file
previous_action
internal_note
```

---

### AI

```txt
AI is optional.
AI can suggest, classify, search, summarize, or cluster.
AI must not be required to save complaints.
AI must not be required to create tickets.
AI must not be required to resolve complaints.
AI failure should not break the core workflow.
```

---

## 10. Core Modules

## 10.1 Auth Module

Purpose:

```txt
authentication
current user retrieval
basic role-based access support
```

Auth handles internal users only:

```txt
agent
manager
admin
```

Current auth style:

```txt
Bearer JWT
```

Main endpoints:

```txt
POST /auth/login
GET /auth/me
```

Public complaint submitters do not need internal user accounts.

---

## 10.2 Users Module

Purpose:

```txt
internal user management
agent records
manager records
admin records
active/inactive user status
```

Users represent internal ACCESS staff, not passengers.

Early implementation may create users only through seeders.

---

## 10.3 Complaints Module

Purpose:

```txt
store original complaints
list complaints
view complaint detail
update complaint basic fields
update complaint status
prepare future public tracking
```

Complaint has:

```txt
reference_no
tracking_token
source
category
complaint_text
status
submitted_at
resolved_at
```

Important rule:

```txt
A complaint may become a ticket, but does not automatically become a ticket.
```

Possible complaint sources:

```txt
quick response workspace
public complaint form
social media
app review
manual import
external integration
```

---

## 10.4 Quick Responses Module

Purpose:

```txt
manual response session storage
response outcome storage
future response preview/suggestion
future reference usage tracking
```

A Quick Response Session stores:

```txt
agent_id
complaint_id
optional ticket_id
selected_hear
selected_empathize
selected_apologize
selected_take_action
final_response
outcome
```

Allowed stable outcomes:

```txt
sent_resolved
sent_hea_action
copy_only
```

Future outcomes may include:

```txt
saved_ticket
escalated
```

Use future outcomes only when the related workflow exists.

---

## 10.5 References Module

Purpose:

```txt
store reusable support information
search support information
tag support information
support future suggestion pipeline
support manager action evidence
```

Reference module replaces older document-focused design.

Core reference tables:

```txt
reference_sources
reference_tags
reference_source_tags
```

Future contextual reference tables:

```txt
quick_response_references
action_request_references
```

Important rule:

```txt
Do not store all search results as used references.
Only store references that were shown, attached, selected, or used according to the relevant workflow rule.
```

---

## 10.6 Tickets Module

Purpose:

```txt
internal agent follow-up workflow
ticket inbox
ticket assignment
ticket status tracking
closure handling
ticket event history
```

Ticket is created when a complaint needs internal handling.

Important rule:

```txt
Ticket should not be created for every complaint by default.
```

---

## 10.7 Action Requests Module

Purpose:

```txt
manager action queue
grouped complaint handling
manager-level issue resolution
closure message preparation
```

Managers handle grouped issues.

Example:

```txt
Many customers report payment deducted but ticket not issued.
```

This becomes one manager action request linked to many complaints and possibly many tickets.

Important rule:

```txt
Action Request = grouped manager issue.
Ticket = individual agent work item.
Complaint = original customer issue.
```

---

## 10.8 Dashboard Module

Purpose:

```txt
read-only summary metrics
agent dashboard data
manager dashboard data
operational overview
```

Dashboard should aggregate from other modules.

Dashboard must not own workflow logic.

Bad:

```txt
Dashboard service creates ticket.
Dashboard service closes complaint.
Dashboard service updates action request.
```

Good:

```txt
Dashboard service reads complaint counts.
Dashboard service reads ticket status summary.
Dashboard service reads action request statistics.
```

---

## 10.9 Audit Module

Purpose:

```txt
system accountability
before/after change tracking
important action logs
```

Audit is cross-module.

Examples:

```txt
complaint status changed
quick response saved
ticket created
ticket assigned
ticket escalated
action request resolved
reference archived
user deactivated
```

Audit logs should use polymorphic-style reference:

```txt
entity_type
entity_id
```

---

## 10.10 Agent Performance Module

Purpose:

```txt
monthly agent performance snapshot
response time metrics
resolution metrics
workflow compliance metrics
```

Agent performance is derived data.

It should be calculated from source-of-truth workflow tables, such as:

```txt
complaints
quick_response_sessions
tickets
ticket_events
action_request_complaints
```

Agent performance must not become the workflow source of truth.

---

## 10.11 AI Module

Purpose:

```txt
optional AI boundary
future LLM provider integration
future FastAPI ML service integration
future RAG integration
future clustering/classification
```

AI should be isolated behind a provider boundary.

Core business modules should not directly depend on external AI services.

Important rule:

```txt
AI failure must not break complaint, quick response, ticket, or manager action workflows.
```

---

## 10.12 Holidays Module

Purpose:

```txt
store official holiday facts (holiday + joint leave)
derive calendar conditions (weekend, long weekend, bridge day)
compute monitoring windows around major holiday categories
serve frontend calendar and holiday overview
```

Holidays stores only official facts.

Monitoring windows default to application constants per category, and an admin may
override the window for an individual holiday through the nullable
`monitoring_before` / `monitoring_after` columns. The override must set both sides
together, is bounded (0–180 days), and supersedes the category default when present.
Long weekends and bridge days are derived at read time, never stored.

Important rule:

```txt
CRUD the facts. Calculate the conditions.
```

Holiday reads are available to every authenticated user. Holiday writes
(create/update/delete/sync), including monitoring overrides, are admin-only
(`HOLIDAY_MANAGE_FORBIDDEN` otherwise).

---

## 10.13 Social Complaints Module

Purpose:

```txt
external social-media ingestion/source layer
fetch social content through Apify
normalize provider responses
store, deduplicate, and paginate ingested records
expose newest social complaints to the frontend
```

Important rule:

```txt
social_complaints is an ingestion/source layer.
It is not an alternative representation of complaints.
A record becomes an ACCESS complaint only through the human Quick Response workflow.
```

The module owns the provider contract (`SocialMediaProvider`) and the Apify-backed
providers (`GooglePlayProvider`, `FacebookProvider`, `XProvider`); the raw HTTP transport
belongs to `integrations/apify/`.

Ingestion is insert-only: re-syncing an already-seen `(source, source_reference)` never
rewrites the stored row.

`POST /social-complaints/sync` is admin-only because it spends Apify credits. An
in-process scheduler (`social-media-sync.scheduler.ts`, started from `server.ts`)
can run the same `SocialMediaSyncService` hourly; it is off unless
`SOCIAL_SYNC_SCHEDULER_ENABLED=true`. The scheduler never owns ingestion logic.

---

## 11. Database Architecture

Database schemas live in:

```txt
src/db/schema/
```

Each schema file should map to a domain area:

```txt
users.schema.ts
complaints.schema.ts
quick-response.schema.ts
references.schema.ts
tickets.schema.ts
action-requests.schema.ts
ticket-events.schema.ts
audit-logs.schema.ts
agent-performance.schema.ts
relations.ts
holidays.schema.ts
social-complaints.schema.ts
```

Database schema ownership:

```txt
users.schema.ts
  users

complaints.schema.ts
  complaints

quick-response.schema.ts
  quick_response_sessions
  quick_response_references

references.schema.ts
  reference_sources
  reference_tags
  reference_source_tags

tickets.schema.ts
  tickets

action-requests.schema.ts
  action_requests
  action_request_complaints
  action_request_references

ticket-events.schema.ts
  ticket_events

audit-logs.schema.ts
  audit_logs

agent-performance.schema.ts
  agent_performance

holidays.schema.ts
  holidays

social-complaints.schema.ts
  social_complaints
```

Important:

```txt
Do not use context_documents, document_tags, context_document_tags, or document_references as the long-term model.
Use reference-based schema instead.
```

---

## 12. Relationship Model

### Users

A user can:

```txt
run quick response sessions
create reference sources
handle tickets
manage action requests
create ticket events
create audit logs
have performance snapshots
```

---

### Complaints

A complaint can:

```txt
be created from Quick Response
be submitted publicly later
be listed and viewed internally
be resolved directly
wait for follow-up action
have many quick response sessions
become one ticket later
be grouped into manager action requests later
be tracked publicly later
```

---

### Quick Response Sessions

A quick response session:

```txt
belongs to one agent
belongs to one complaint
may belong to one ticket
stores selected response parts
stores final response
stores final outcome
may have references later
```

---

### Reference Sources

A reference source:

```txt
is created by a user
has one source type
may have one category
may have many tags
may support quick response
may support manager action
```

---

### Tickets

A ticket:

```txt
belongs to one complaint
may be assigned to one agent
may have many quick response sessions
may be linked to action requests through a join table
has many ticket events
```

---

### Action Requests

An action request:

```txt
may be assigned to one manager
groups many complaints
may involve many tickets
stores manager action result
stores closure message
may have references/evidence attached
```

Action requests connect to complaints and tickets through:

```txt
action_request_complaints
```

---

### Ticket Events

Ticket events record ticket timeline.

Examples:

```txt
created
assigned
hea_sent
manager_action_linked
manager_action_done
resolved
closed
reopened
```

---

### Audit Logs

Audit logs record accountability across the system.

They use:

```txt
entity_type
entity_id
```

This allows the audit log to point to different entities:

```txt
complaints
quick_response_sessions
tickets
users
reference_sources
action_requests
```

---

## 13. Workflow Architecture

## 13.1 Manual Quick Response Save Flow

```txt
Agent inputs complaint in Quick Response workspace
→ Agent manually writes or edits response
→ Backend creates complaint
→ Backend creates quick_response_session
→ Backend maps outcome to complaint status
```

Status mapping:

```txt
outcome = sent_resolved
→ complaint.status = resolved
→ complaint.resolved_at = now

outcome = sent_hea_action
→ complaint.status = waiting_action
→ complaint.resolved_at = null

outcome = copy_only
→ complaint.status = submitted
→ complaint.resolved_at = null
```

Important:

```txt
Saving a quick response does not automatically mean ticket exists.
```

---

## 13.2 References Flow

```txt
Agent or system searches reference_sources
→ backend filters by category, source_type, tags, or search text
→ useful references are shown
→ selected/shown/used references may be recorded by contextual reference tables
```

Reference search should work without RAG.

---

## 13.3 Suggestion Pipeline Flow

```txt
Agent inputs complaint text
→ backend searches references
→ backend scores candidate references
→ backend builds response suggestion
→ backend returns preview
→ no database write during preview
```

Preview rule:

```txt
Preview is read-only.
```

Saving rule:

```txt
Saving happens through the normal quick response save flow.
```

---

## 13.4 Follow-up Workflow

```txt
Quick response outcome indicates follow-up is needed
→ backend creates ticket
→ backend finds or creates action request
→ backend links complaint/ticket to action_request_complaints
→ complaint waits for manager action
```

This workflow should be implemented when ticket and action request modules exist.

---

## 13.5 Manager Action Queue Flow

```txt
Similar complaints are grouped
→ action request is created
→ manager reviews issue
→ manager records action_taken
→ manager writes closure_message
→ references/evidence can be attached
→ linked tickets/complaints are updated
```

Managers handle grouped issues, not individual ticket replies.

---

## 13.6 Final Closure Flow

```txt
Manager provides Take Action
→ linked tickets become ready for closure
→ agent sends final response
→ quick_response_session records final response
→ ticket is closed
→ complaint is resolved
```

---

## 14. API Architecture

Use REST routes.

Current convention:

```txt
Do not use /api/v1 prefix unless versioning becomes necessary.
```

Reason:

```txt
The project is still early and there is no concrete v2 need yet.
Keep route paths simple.
```

Main route groups:

```txt
/auth
/users
/complaints
/quick-responses
/references
/tickets
/action-requests
/dashboard
/agent-performance
/holidays
/social-complaints
```

Public route groups may be added later:

```txt
/public/complaints
/track
```

Internal routes require authentication unless explicitly public.

---

## 15. Response Architecture

Use a consistent response format.

Success response:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Something went wrong",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

Paginated response:

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

Keep response shape predictable across modules.

---

## 16. Error Handling Architecture

Use centralized error handling.

Do not throw raw strings.

Use structured application errors:

```txt
AppError
NotFoundError
ValidationError
UnauthorizedError
ForbiddenError
ConflictError
```

The error plugin should convert internal errors into consistent API responses.

Routes should not manually format every error.

---

## 17. Authorization Architecture

Roles:

```txt
admin
manager
agent
public
```

### Admin

Can generally:

```txt
manage internal data
manage users
manage references
view broad system data
perform operational overrides
```

### Manager

Can generally:

```txt
view manager dashboard
review grouped complaints
manage action requests
update manager action status
view team performance
```

### Agent

Can generally:

```txt
handle complaints
run quick response sessions
handle tickets
send responses
request manager action
view relevant support references
```

### Public User

Can eventually:

```txt
submit complaint
track complaint with reference/tracking token
```

Public users must not access:

```txt
tickets
action requests
internal users
audit logs
manager dashboard
agent performance
internal references
```

Authorization should be enforced in services or route guards, not only in the frontend.

---

## 18. Transaction Architecture

Use database transactions for workflows that must be atomic.

Examples:

```txt
create complaint + quick_response_session
create ticket + action_request link
close ticket + resolve complaint
manager action update + update linked tickets
```

If one step fails, the whole operation should roll back.

Repositories should accept a transaction object when needed.

Services should decide when to open transactions.

---

## 19. Status Management Architecture

Status changes should be owned by services.

Avoid duplicating status transition rules across routes.

Examples:

```txt
Quick Responses Service maps response outcome to complaint status.
Tickets Service controls ticket status transitions.
Action Requests Service controls manager action status.
Complaints Service controls manual complaint status updates.
```

Do not let routes directly decide complex status transitions.

---

## 20. Reference Architecture

Reference is the long-term support knowledge model.

Do not model support knowledge as only documents.

Reference source fields may include:

```txt
source_type
title
category
content
url
file_url
status
version
search_text
metadata
```

Reference source types may include:

```txt
sop
faq
policy
guide
template
known_issue
external_link
uploaded_file
previous_action
internal_note
```

Contextual reference usage should be stored separately:

```txt
quick_response_references
action_request_references
```

Why separate?

```txt
reference_sources = reusable source
quick_response_references = source used/shown in an agent response
action_request_references = source/evidence attached to manager action
```

---

## 21. AI/RAG Architecture

AI/RAG should be added as an extension.

Possible future tables:

```txt
rag_sources
rag_chunks
rag_retrievals
embedding_jobs
ml_inference_logs
```

Possible future sources:

```txt
reference_sources
resolved tickets
approved quick responses
manager-approved action requests
known issues
```

Important RAG rule:

```txt
RAG should retrieve from a controlled knowledge layer,
not freely query every operational table.
```

Correct design:

```txt
complaint is saved first
agent can handle manually
AI may suggest category/response/similar cases
AI failure is logged
business workflow continues
```

Incorrect design:

```txt
complaint cannot be saved unless AI succeeds
ticket cannot be created unless ML clustering succeeds
manager action queue cannot work unless AI is online
```

---

## 22. Dependency Direction

Prefer this dependency direction:

```txt
routes → services → repositories → db schema
```

Allowed service collaboration:

```txt
Quick Responses Service → Complaints Service
Quick Responses Service → References Service
Tickets Service → Complaints Service
Tickets Service → Action Requests Service
Action Requests Service → Tickets/Complaints repositories
References Service → Reference repositories
Dashboard Service → read-only repositories
```

Avoid circular dependencies.

If two modules need each other too much, move shared workflow into a higher-level orchestration service or rethink the boundary.

---

## 23. Logging and History

Use different logs for different purposes.

```txt
ticket_events
audit_logs
```

### Ticket Events

Used for ticket timeline and support workflow history.

Useful for support staff.

Examples:

```txt
ticket created
HEA sent
linked to manager action
manager action done
ticket closed
```

### Audit Logs

Used for accountability and system-level change tracking.

Useful for debugging, compliance, and admin review.

Examples:

```txt
user changed complaint status
manager changed action request closure message
admin archived reference source
agent saved quick response
```

---

## 24. Seeder Architecture

Seeders should create realistic demo data.

Seed data should include, depending on implemented modules:

```txt
admin user
manager users
agent users
sample complaints
sample quick response sessions
sample references
sample tickets
sample action requests
sample ticket events
agent performance snapshots
```

Seed examples should reflect realistic complaints:

```txt
saldo terpotong tapi tiket tidak muncul
kereta terlambat
pembatalan tiket gagal
barang tertinggal
aplikasi error saat pembayaran
fasilitas stasiun bermasalah
```

Avoid random placeholder data that does not demonstrate workflow.

Seeders should be safe to rerun when practical.

---

## 25. Development Principles

When adding a new feature:

```txt
1. Identify which business module owns it.
2. Add DTO validation first.
3. Keep routes thin.
4. Put workflow logic in service.
5. Keep database access in repository.
6. Add schema changes through migration.
7. Add seed data if useful for demo.
8. Add audit/event records for important workflow changes when the audit/event module exists.
```

When unsure where something belongs, ask:

```txt
Is this about the original complaint?
Is this about an agent response session?
Is this about internal follow-up work?
Is this about grouped manager action?
Is this about reusable support knowledge?
Is this only analytics?
Is this optional AI assistance?
```

---

## 26. What Not To Do

Do not:

```txt
make every complaint automatically become a ticket
make manager action requests behave like individual tickets
put dashboard workflow logic inside dashboard service
put database queries directly in route files
make AI mandatory for core workflow
add RAG tables before reference foundation is stable
use one giant service for all workflow logic
duplicate status transition rules across modules
allow public routes to expose internal support data
treat documents as the only knowledge source
store all search results as used references
```

---

## 27. Architecture vs Plan

Use this document for stable architectural decisions:

```txt
module boundaries
domain definitions
dependency direction
authorization model
workflow invariants
database ownership
API style
extension rules
```

Use separate plan documents for volatile implementation details:

```txt
current phase scope
endpoint build order
temporary limitations
migration sequence
manual testing checklist
acceptance checklist
```

Examples:

```txt
ARCHITECTURE.md
  stable system guide

PHASE-2.md
  current implementation plan

SCHEMA_IMPLEMENTATION.md
  database implementation plan

plan.md
  short-term task plan
```

If a phase changes, update the phase plan.

If a domain boundary changes, update this architecture guide.

---

## 28. Final Architecture Summary

ACCESS backend is built around this mental model:

```txt
Complaint
  original customer issue

Quick Response Session
  agent response/action session

Reference Source
  reusable support knowledge source

Ticket
  internal agent work item

Action Request
  manager-level grouped issue

Ticket Event
  ticket timeline

Audit Log
  accountability record

Agent Performance
  derived metric snapshot

AI
  optional future assistant
```

Protect this model when implementing new features.

The safest rule:

```txt
Save the business data first.
Let humans continue the workflow.
Add automation only as assistance.
```
