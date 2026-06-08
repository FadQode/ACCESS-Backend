# architecture.md

# ACCESS Backend Architecture Guide

## 1. Overview

ACCESS is a customer-support workflow system for handling passenger complaints, especially complaints related to transportation services.

The backend is designed around a human-centered support process:

```txt
Complaint Intake
→ Quick Response / Ticket Handling
→ Escalation
→ Manager Action Queue
→ Resolution
→ Tracking & Metrics
```

The system may later include AI, RAG, complaint clustering, or ML inference. However, the first version must prioritize the business process and remain fully usable without AI.

---

## 2. Architecture Goals

The backend should be designed to be:

```txt
modular
business-process-first
easy to extend
safe for future AI/RAG integration
clear for contributors and coding agents
not over-engineered for v1
```

The core backend must support:

```txt
public complaint submission
internal ticket handling
quick response workflow
manager-level grouped action queue
document lookup
audit/history tracking
dashboard metrics
```

---

## 3. Technology Stack

Recommended stack:

```txt
Runtime: Bun
Framework: Elysia
Language: TypeScript
Database: PostgreSQL
ORM: Drizzle ORM
Validation: Elysia TypeBox / t
API Style: REST
```

Optional future stack:

```txt
ML / AI Service: FastAPI
Queue: Redis-based queue
RAG Storage: pgvector or external vector database
Background Jobs: worker service
```

The backend should not require AI, ML, queue workers, or vector search for v1.

---

## 4. Architectural Style

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
  tickets/
  quick-response/
  action-requests/
  documents/
  dashboard/
  audit/
  agent-performance/
  ai/
```

Each module should own its own related files:

```txt
routes
dto
service
repository
entity/types
```

Recommended module structure:

```txt
modules/
  complaints/
    complaints.routes.ts
    complaints.service.ts
    complaints.repository.ts
    complaints.dto.ts
    complaints.entity.ts
```

---

## 5. Main Folder Structure

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
      tickets.schema.ts
      quick-response.schema.ts
      action-requests.schema.ts
      documents.schema.ts
      ticket-events.schema.ts
      audit-logs.schema.ts
      agent-performance.schema.ts
      relations.ts
    seed/
      index.ts
      users.seed.ts
      complaints.seed.ts
      tickets.seed.ts
      quick-response.seed.ts
      action-requests.seed.ts
      documents.seed.ts
      ticket-events.seed.ts
      agent-performance.seed.ts

  plugins/
    auth.plugin.ts
    error.plugin.ts
    logger.plugin.ts
    response.plugin.ts

  shared/
    constants/
    errors/
    types/
    utils/

  modules/
    auth/
    users/
    complaints/
    tickets/
    quick-response/
    action-requests/
    documents/
    dashboard/
    audit/
    agent-performance/
    ai/
```

---

## 6. Layer Responsibilities

Each module should follow this responsibility split:

```txt
routes       → HTTP request/response layer
dto          → request and response validation shape
service      → business rules and workflow decisions
repository   → database access only
entity       → domain-facing types
db/schema    → Drizzle database table definitions
```

### Routes

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
manually build unrelated module behavior
```

---

### DTOs

DTOs define the external API contract.

DTO files should contain:

```txt
request body schema
query schema
params schema
response shape if needed
```

DTOs should protect services from raw, invalid, or incomplete input.

---

### Services

Services own business rules.

Services should decide things like:

```txt
can this complaint become a ticket?
can this ticket be closed?
should this quick response create a ticket?
should this complaint be linked to an action request?
what status transition is valid?
```

Services may call repositories and other services when needed.

---

### Repositories

Repositories own database access.

Repositories should:

```txt
select data
insert data
update data
delete/archive data
perform database joins
```

Repositories should not contain business decisions.

---

### Entities / Types

Entity files define domain-facing types.

These types represent how the module understands its own data internally.

They should not depend on HTTP request details.

---

## 7. Core Domain Separation

The backend must preserve this domain separation:

```txt
Complaint = original passenger issue
Ticket = internal agent work item
Quick Response Session = response composition/action session
Action Request = manager-level grouped issue
Document = support knowledge source
Ticket Event = ticket timeline
Audit Log = accountability record
Agent Performance = derived metric snapshot
AI = optional assistant
```

This separation is the most important architectural rule in the project.

---

## 8. Core Modules

## 8.1 Auth Module

Purpose:

```txt
authentication
current user retrieval
role-based access support
```

Auth handles internal users only:

```txt
agent
manager
admin
```

Public complaint submitters do not need full user accounts in v1.

---

## 8.2 Users Module

Purpose:

```txt
internal user management
agent records
manager records
admin records
active/inactive user status
```

Users represent internal ACCESS staff, not passengers.

---

## 8.3 Complaints Module

Purpose:

```txt
raw passenger complaint intake
public complaint submission
external complaint registration
complaint status
complaint tracking
```

A complaint is the original issue from the passenger.

Important rule:

```txt
A complaint may become a ticket, but does not always have to.
```

A complaint can be:

```txt
resolved directly through Quick Response
converted into a Ticket
grouped into an Action Request
tracked publicly using reference number and tracking token
```

---

## 8.4 Tickets Module

Purpose:

```txt
internal agent handling workflow
ticket inbox
ticket assignment
ticket status tracking
HEA/HEAT response storage
closure handling
ticket event history
```

A ticket is created when a complaint requires internal handling.

Important rule:

```txt
A ticket should not represent every complaint automatically.
```

Tickets are operational work items for agents.

---

## 8.5 Quick Response Module

Purpose:

```txt
fast handling of external complaints
response composition
HEA/HEAT response drafting
copy/resolve/save/escalate outcomes
```

Quick Response supports complaints from:

```txt
social media
app review
DM
public external source
internal ticket page
```

A Quick Response Session must belong to a complaint.

It may optionally belong to a ticket.

---

## 8.6 Action Requests Module

Purpose:

```txt
manager action queue
grouped complaint handling
manager-level issue resolution
closure message preparation
```

Managers should not primarily handle individual tickets one by one.

Managers handle grouped issues.

Example:

```txt
Many passengers report payment deducted but ticket not issued.
```

This becomes one manager action request linked to many complaints and possibly many tickets.

Important rule:

```txt
Action Request = grouped manager issue.
Ticket = individual agent work item.
Complaint = original passenger issue.
```

---

## 8.7 Documents Module

Purpose:

```txt
SOP storage
FAQ storage
policy storage
guide storage
template storage
known issue storage
document search
document tagging
document references
```

For v1, document lookup should use normal database search:

```txt
category
doc_type
status
title
search_text
tags
content
```

Do not require RAG in v1.

Documents should help agents answer complaints more consistently.

---

## 8.8 Dashboard Module

Purpose:

```txt
read-only summary metrics
agent dashboard
manager dashboard
operational overview
```

Dashboard should aggregate from other modules.

Dashboard must not own complaint, ticket, or action request workflow logic.

---

## 8.9 Audit Module

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
ticket created
ticket assigned
ticket escalated
action request resolved
document archived
user deactivated
```

---

## 8.10 Agent Performance Module

Purpose:

```txt
monthly agent performance snapshot
response time metrics
resolution metrics
workflow compliance metrics
```

Agent performance is derived data.

It should be calculated from source-of-truth workflow tables such as:

```txt
tickets
quick_response_sessions
ticket_events
action_request_complaints
```

---

## 8.11 AI Module

Purpose:

```txt
optional AI boundary
mock suggestions for v1
future LLM provider integration
future FastAPI ML service integration
future RAG/clustering/classification
```

AI should be isolated behind a provider boundary.

Core business modules should not directly depend on external AI services.

Important rule:

```txt
AI failure must not break complaint, ticket, quick response, or manager action workflows.
```

---

## 9. Database Architecture

The v1 database should include these main tables:

```txt
users
complaints
tickets
quick_response_sessions
action_requests
action_request_complaints
context_documents
document_tags
context_document_tags
document_references
ticket_events
audit_logs
agent_performance
```

RAG-related tables are postponed.

Do not add these in v1 unless explicitly requested:

```txt
rag_sources
rag_chunks
rag_retrievals
embedding_jobs
ml_inference_logs
```

---

## 10. Relationship Model

### Users

A user can:

```txt
handle tickets
run quick response sessions
manage action requests
upload documents
reference documents
create ticket events
create audit logs
have performance snapshots
```

---

### Complaints

A complaint can:

```txt
be submitted publicly
be tracked publicly
be resolved directly
become one ticket
have many quick response sessions
be grouped into manager action requests
```

---

### Tickets

A ticket:

```txt
belongs to one complaint
may be assigned to one agent
may have many quick response sessions
may be linked to action requests through a join table
may reference documents
has many ticket events
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
may reference documents
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
```

Action requests connect to complaints and tickets through:

```txt
action_request_complaints
```

---

### Documents

A document:

```txt
is uploaded by a user
has one category
may have many tags
may be referenced in tickets
may be referenced in quick response sessions
```

Documents are the v1 knowledge source before RAG exists.

---

### Ticket Events

Ticket events record ticket timeline.

Examples:

```txt
created
assigned
hea_sent
escalated
manager_action_linked
resolved
closed
reopened
```

---

### Audit Logs

Audit logs record accountability across the system.

They use a polymorphic-style reference:

```txt
entity_type
entity_id
```

This allows the audit log to point to different entities such as:

```txt
tickets
complaints
users
documents
action_requests
quick_response_sessions
```

---

## 11. Business Workflow Architecture

## 11.1 Public Complaint Flow

```txt
Passenger submits complaint
→ backend creates complaint
→ backend generates reference number
→ backend generates tracking token
→ complaint becomes visible to agents
```

The complaint does not need to become a ticket immediately.

---

## 11.2 Agent Ticket Flow

```txt
Agent reviews complaint
→ complaint may be converted into ticket
→ ticket is assigned
→ agent sends HEA/HEAT response
→ ticket may be resolved or escalated
→ ticket history is recorded
```

---

## 11.3 Quick Response Flow

```txt
Agent inputs external complaint
→ system stores complaint
→ quick response session is created
→ agent prepares response
→ agent chooses final outcome
```

Possible outcomes:

```txt
copy_only
sent_resolved
sent_hea_action
saved_ticket
escalated
```

---

## 11.4 Manager Action Queue Flow

```txt
similar complaints are grouped
→ action request is created
→ manager reviews issue
→ manager records action taken
→ manager writes closure message
→ linked tickets/complaints are updated
```

Managers handle grouped issues, not individual ticket replies.

---

## 11.5 Document Lookup Flow

```txt
Agent searches document
→ backend searches context documents by category/tags/search text
→ agent opens useful SOP/FAQ/template
→ agent may reference document in ticket or quick response
```

This flow works without RAG.

---

## 12. API Architecture

Use REST routes with this prefix:

```txt
/api/v1
```

Recommended route groups:

```txt
/api/v1/auth
/api/v1/users
/api/v1/complaints
/api/v1/tickets
/api/v1/quick-responses
/api/v1/action-requests
/api/v1/documents
/api/v1/dashboard
/api/v1/agent-performance
```

Public route group:

```txt
/api/v1/public/complaints
```

Public routes should only expose:

```txt
complaint submission
complaint tracking
```

Internal routes require authentication.

---

## 13. Response Architecture

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
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## 14. Error Handling Architecture

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

---

## 15. Authorization Architecture

Roles:

```txt
admin
manager
agent
public
```

### Admin

Can:

```txt
manage users
manage system configuration
manage documents
view broad system data
```

### Manager

Can:

```txt
view manager dashboard
manage action requests
review grouped complaints
update manager action status
view team performance
```

### Agent

Can:

```txt
view assigned/relevant complaints
handle tickets
run quick response sessions
reference documents
escalate issues to manager action queue
```

### Public User

Can:

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
```

---

## 16. Document Lookup Architecture

Document lookup is the v1 knowledge strategy.

Documents should be searchable through:

```txt
title
category
doc_type
status
tags
search_text
content
```

This allows the system to recommend or display related documents without full AI/RAG.

Example:

```txt
Complaint category: payment
Search query: saldo terpotong

Possible documents:
- SOP Refund Saldo Terpotong
- FAQ Pembayaran Gagal
- Known Issue Payment Gateway Timeout
```

Document references should be recorded when agents use documents during support work.

---

## 17. Future AI/RAG Architecture

AI/RAG should be added later as an extension.

Future possible tables:

```txt
rag_sources
rag_chunks
rag_retrievals
```

Future possible sources:

```txt
context documents
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

AI should enrich the workflow, not own it.

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

## 18. Dependency Direction

Prefer this dependency direction:

```txt
routes → services → repositories → db schema
```

Allowed service collaboration:

```txt
Quick Response Service → Complaints Service
Quick Response Service → Tickets Service
Tickets Service → Complaints Service
Tickets Service → Action Requests Service
Action Requests Service → Tickets/Complaints repositories
Documents Service → Document repositories
Dashboard Service → read-only repositories
```

Avoid circular dependencies.

If two modules need each other too much, move the shared workflow into a higher-level orchestration function or rethink the boundary.

---

## 19. Logging and History

Use two types of history:

```txt
ticket_events
audit_logs
```

### Ticket Events

Used for ticket timeline and support workflow history.

Visible or useful to support staff.

### Audit Logs

Used for accountability and system-level change tracking.

Useful for debugging, compliance, and admin review.

---

## 20. Seeder Architecture

Seeders should create realistic demo data.

Seed data should include:

```txt
admin user
manager users
agent users
sample complaints
sample tickets
quick response sessions
manager action requests
context documents
document tags
ticket events
agent performance snapshots
```

Seed examples should reflect real passenger complaints:

```txt
saldo terpotong tapi tiket tidak muncul
kereta terlambat
pembatalan tiket gagal
barang tertinggal
aplikasi error saat pembayaran
fasilitas stasiun bermasalah
```

Avoid random placeholder data that does not demonstrate the workflow.

---

## 21. Development Principles

When adding a new feature:

```txt
1. Identify which business module owns it.
2. Add DTO validation first.
3. Keep routes thin.
4. Put workflow logic in service.
5. Keep database access in repository.
6. Add schema changes through migration.
7. Add seed data if useful for demo.
8. Add audit/event records for important workflow changes.
```

When unsure where something belongs, ask:

```txt
Is this about the original complaint?
Is this about agent work?
Is this about quick response composition?
Is this about grouped manager action?
Is this about support knowledge?
Is this only analytics?
Is this optional AI assistance?
```

---

## 22. What Not To Do

Do not:

```txt
make every complaint automatically become a ticket
make manager action requests behave like individual tickets
put dashboard logic inside ticket service
put database queries directly in route files
make AI mandatory for core workflow
add RAG tables before document lookup is stable
use one giant service for all workflow logic
duplicate status transition rules across modules
allow public routes to expose internal support data
```

---

## 23. Implementation Priority

Recommended build order:

```txt
1. Project foundation
2. Database schema
3. Auth and users
4. Complaints
5. Tickets
6. Quick Response
7. Action Requests
8. Documents
9. Ticket Events and Audit Logs
10. Dashboard
11. Agent Performance
12. Optional AI/RAG extension
```

The backend should be useful before AI exists.

---

## 24. Final Architecture Summary

ACCESS backend is built around this mental model:

```txt
Complaint
  original passenger issue

Ticket
  internal agent work item

Quick Response Session
  agent response composition/action session

Action Request
  manager-level grouped issue

Document
  support knowledge source

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
