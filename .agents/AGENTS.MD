# AGENTS.md

# ACCESS Backend Architecture Guide

This document defines the architectural direction for the ACCESS backend. It is intended for AI coding agents, contributors, and future maintainers working on this project.

ACCESS is a customer-support workflow system for handling transportation-related complaints. The system is designed around human customer support agents, manager-level action handling, and optional AI assistance. AI/ML features must support the workflow, not replace the business process.

---

## 1. Core Philosophy

The backend must be designed around the business process first.

Primary workflow:

```txt
Complaint Intake
→ Ticket / Quick Response Handling
→ Escalation
→ Manager Action Queue
→ Resolution
→ Tracking & Metrics
```

AI, RAG, clustering, and ML inference are optional future capabilities. They must not become required for the core complaint-handling flow to work.

The system should still function even if AI services are unavailable.

---

## 2. Current Backend Stack

Preferred stack for this backend:

```txt
Runtime: Bun
Framework: Elysia
Language: TypeScript
Database: PostgreSQL
ORM: Drizzle ORM
API Style: REST
Validation: Elysia TypeBox / t
```

Future optional services:

```txt
ML / AI Service: FastAPI
Queue: Redis-based queue
RAG: pgvector or external vector database
```

Do not introduce Python, queue workers, or vector search into the core backend unless the project explicitly moves into the AI/RAG phase.

---

## 3. Architecture Style

Use feature-based architecture.

Do not organize the backend only by technical layers such as:

```txt
controllers/
services/
repositories/
```

Instead, organize by business modules:

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
  social-complaints/
```

Each module may contain its own route, service, repository, DTO, and entity files.

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

General responsibility split:

```txt
routes       → HTTP layer
dto          → request/response validation
service      → business rules
repository   → database queries
entity       → domain-facing types
db/schema    → Drizzle database schema
```

---

## 4. Source Folder Structure

Recommended structure:

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
      users.schema.ts
      complaints.schema.ts
      tickets.schema.ts
      quick-response.schema.ts
      action-requests.schema.ts
      documents.schema.ts
      ticket-events.schema.ts
      audit-logs.schema.ts
      agent-performance.schema.ts
      social-complaints.schema.ts
      relations.ts
    seed/
      index.ts
      users.seed.ts
      complaints.seed.ts
      tickets.seed.ts
      documents.seed.ts
      action-requests.seed.ts

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

Keep shared code small. If code only belongs to one business feature, keep it inside that module.

---

## 5. Core Modules

### 5.1 Auth Module

Purpose:

```txt
authentication
current user session
role-based access support
```

Auth should support internal users such as:

```txt
agent
manager
admin
```

Auth should not contain complaint, ticket, or manager queue business logic.

---

### 5.2 Users Module

Purpose:

```txt
internal user management
agent/manager/admin records
active/inactive status
```

This module represents backend users, not public customers.

For v1, public complaint submitters do not need full user accounts.

---

### 5.3 Complaints Module

Purpose:

```txt
raw complaint intake
public complaint submission
external complaint registration
complaint tracking
complaint status
```

A complaint is the original customer issue.

Important rule:

```txt
A complaint may become a ticket, but does not always have to.
```

Some complaints may be resolved directly through Quick Response.

---

### 5.4 Tickets Module

Purpose:

```txt
internal agent handling workflow
ticket inbox
ticket status tracking
HEA/HEAT response storage
closure handling
```

A ticket is an internal work item for agents.

Tickets should represent operational handling, not raw external messages.

Important rule:

```txt
Ticket logic belongs in the Tickets module.
Dashboard must not own ticket workflow logic.
```

---

### 5.5 Quick Response Module

Purpose:

```txt
fast response workflow for external complaints
agent response composition
selected HEA/HEAT response parts
copy / resolve / save as ticket / escalate outcome
```

Quick Response is for high-speed handling of complaints from sources such as social media, app reviews, and external channels.

A Quick Response Session may link to:

```txt
complaint only
complaint + ticket
```

AI suggestions may be added later, but the module must work manually first.

---

### 5.6 Action Requests Module

Purpose:

```txt
manager action queue
grouped complaint handling
manager-level issue resolution
closure message for related complaints/tickets
```

Managers do not primarily receive individual tickets one by one.

Managers receive grouped issues/action requests based on similar complaints or repeated problems.

Important rule:

```txt
Action Request = manager-level grouped issue.
Ticket = agent-level handling item.
Complaint = original customer issue.
```

Use a join table to connect action requests with complaints and tickets.

---

### 5.7 Documents Module

Purpose:

```txt
SOP / FAQ / policy / guide / template storage
document search
document tagging
document references in tickets or quick responses
```

For v1, document lookup should use normal database search:

```txt
category
tags
title
search_text
content
```

Do not require RAG retrieval for v1.

The system should allow agents to find useful documents without AI.

---

### 5.8 Dashboard Module

Purpose:

```txt
summary statistics
agent dashboard
manager dashboard
operational metrics
```

Dashboard must be read-oriented.

It should aggregate from other modules, not own core business workflows.

Dashboard must not duplicate ticket, complaint, or action request logic.

---

### 5.9 Audit Module

Purpose:

```txt
track important backend actions
record before/after changes
support accountability
```

Audit should be usable by other modules.

Examples of audited actions:

```txt
ticket created
ticket assigned
complaint status changed
ticket escalated
action request resolved
document archived
user deactivated
```

---

### 5.10 Agent Performance Module

Purpose:

```txt
monthly performance snapshot
response time metrics
resolution metrics
workflow compliance metrics
```

Agent performance data should be treated as derived data.

It must not be the source of truth for operational workflow.

---

### 5.11 AI Module

Purpose:

```txt
optional AI boundary
mock response suggestions
future FastAPI integration
future classification/RAG/clustering
```

The AI module must be isolated.

Core modules should not depend directly on external AI providers.

Use a provider boundary:

```txt
Mock provider now
FastAPI provider later
LLM provider later
```

Important rule:

```txt
AI output is optional enrichment.
AI failure must not break complaint, ticket, or manager queue flows.
```

---

## 6. Database Design Principles

The database should follow the current v1 ERD direction:

```txt
USER
COMPLAINT
SOCIAL_COMPLAINT
TICKET
QUICK_RESPONSE_SESSION
ACTION_REQUEST
ACTION_REQUEST_COMPLAINT
CONTEXT_DOCUMENT
DOCUMENT_TAG
CONTEXT_DOCUMENT_TAG
DOCUMENT_REFERENCE
TICKET_EVENT
AUDIT_LOG
AGENT_PERFORMANCE
```

`SOCIAL_COMPLAINT` is an ingestion/source layer, not an alternative representation
of `COMPLAINT`. A record becomes an ACCESS complaint only through the human Quick
Response workflow.

RAG-related tables should be postponed.

Do not add these to the v1 core unless explicitly requested:

```txt
RAG_SOURCE
RAG_CHUNK
RAG_RETRIEVAL
```

They may be added later as an AI/RAG extension.

---

## 7. Relationship Rules

### Complaint to Ticket

```txt
Complaint → zero or one Ticket
```

A complaint can be handled without becoming a ticket.

### Complaint to Quick Response

```txt
Complaint → many Quick Response Sessions
```

A complaint may be handled through one or more response sessions.

### Ticket to Quick Response

```txt
Ticket → many Quick Response Sessions
```

A quick response may also happen inside ticket handling.

### Action Request to Complaint

```txt
Action Request → many Complaints
```

Manager action requests group similar complaints.

### Action Request to Ticket

Use the action request complaint linking table.

Do not make the ticket table directly depend on one action request as the only relationship path.

### Documents

Documents can be referenced by:

```txt
tickets
quick response sessions
```

Document references are not the same as RAG retrieval logs.

---

## 8. Document Lookup Strategy for v1

Document lookup should be implemented without RAG first.

Use:

```txt
CONTEXT_DOCUMENT.category
CONTEXT_DOCUMENT.doc_type
CONTEXT_DOCUMENT.status
CONTEXT_DOCUMENT.search_text
DOCUMENT_TAG.name
```

Agents should be able to search and filter documents manually.

Example lookup flow:

```txt
Complaint category: payment
Search query: saldo terpotong
System finds:
- SOP refund saldo terpotong
- FAQ pembayaran gagal
- Known issue payment gateway timeout
```

This keeps the system useful before AI/RAG exists.

---

## 9. Future RAG Strategy

When RAG becomes necessary, introduce a separate knowledge layer.

Future tables may include:

```txt
RAG_SOURCE
RAG_CHUNK
RAG_RETRIEVAL
```

RAG should not directly and freely query every operational table.

Instead, selected trusted content should be indexed into a controlled retrieval layer.

Possible RAG sources:

```txt
context documents
resolved tickets
manager-approved action requests
approved response templates
known issues
```

Raw unresolved complaints should not be used directly for customer-facing answer generation unless sanitized and approved.

---

## 10. Business Flow Boundaries

### Public Complaint Flow

```txt
public user submits complaint
backend creates complaint reference number
backend creates tracking token
complaint is stored
agent may later triage it
```

### Agent Ticket Flow

```txt
agent views complaint/ticket
agent sends HEA/HEAT response
agent resolves or escalates
ticket history is recorded
```

### Quick Response Flow

```txt
agent inputs external complaint
agent prepares response
agent chooses outcome:
- copy only
- sent and resolved
- sent HEA and request action
- save as ticket
- escalate
```

### Manager Action Queue Flow

```txt
similar complaints are grouped
manager reviews grouped issue
manager records action taken
closure message is prepared
linked tickets/complaints receive update
```

---

## 11. API Design Rules

Use REST-style route groups.

Recommended prefix:

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
/api/v1/social-complaints
```

Public route group:

```txt
/api/v1/public/complaints
```

Keep routes thin.

Routes should:

```txt
validate request
get authenticated user
call service
return response
```

Routes should not contain complex business logic.

---

## 12. Response Format

Use consistent response format.

Success:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Something went wrong",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

Pagination:

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

## 13. Error Handling Rules

Use centralized error handling.

Do not throw raw strings.

Prefer structured application errors such as:

```txt
NotFoundError
UnauthorizedError
ForbiddenError
ValidationError
ConflictError
AppError
```

Every module should return predictable errors.

---

## 14. Authorization Rules

Role boundaries:

```txt
admin:
  manage users
  manage system-level data
  manage holidays (create/update/delete/sync, monitoring overrides)
  trigger social complaint ingestion

manager:
  view dashboard
  manage action requests
  review grouped complaints
  view team performance

agent:
  handle complaints
  handle tickets
  use quick response
  reference documents
```

Public users:

```txt
submit complaint
track complaint using reference/tracking token
```

Do not expose internal ticket, action request, or user data to public routes.

---

## 15. Seed Data Rules

Seed data should support demo and development.

Seeders should include:

```txt
admin user
manager users
agent users
sample complaints
sample tickets
sample quick response sessions
sample action requests
sample context documents
sample document tags
sample ticket events
```

Seed data should reflect the real product flow.

Do not seed random meaningless data.

Use realistic transportation complaint examples such as:

```txt
saldo terpotong tapi tiket tidak muncul
keterlambatan kereta
pembatalan tiket gagal
barang tertinggal
aplikasi error saat pembayaran
fasilitas stasiun bermasalah
```

---

## 16. Naming Rules

Use business-friendly naming.

Preferred names:

```txt
complaints
tickets
quick-response
action-requests
documents
dashboard
```

Avoid exposing internal framework concepts in business names.

Do not name modules around AI unless the feature truly belongs to the AI boundary.

Avoid making HEA/HEAT a technical module name. HEA/HEAT is a response framework, not a backend domain module.

---

## 17. AI/ML Resilience Rules

AI must not block the main system.

Correct design:

```txt
complaint is saved first
ticket can be created manually
agent can respond manually
AI suggestion may enrich later
```

Incorrect design:

```txt
complaint cannot be saved unless AI classification succeeds
ticket cannot be created unless AI clustering succeeds
manager queue cannot work unless ML service is online
```

AI fields should be nullable or optional.

AI failures should be logged but should not stop normal business operations.

---

## 18. Implementation Priority

Build in this order:

```txt
1. Project foundation
2. Auth and users
3. Complaints
4. Tickets
5. Quick Response
6. Action Requests
7. Documents
8. Dashboard
9. Audit and events
10. Agent performance
11. Optional AI/RAG extension
```

Do not implement AI/RAG before the business workflow is usable.

---

## 19. What Not To Do

Do not:

```txt
put all routes in one file
put all database queries inside routes
make dashboard own ticket logic
make AI required for complaint handling
make manager action queue handle only one ticket at a time
make every complaint automatically become a ticket
add RAG tables before document lookup is stable
duplicate business rules across modules
```

---

## 20. Final Architectural Rule

The ACCESS backend must be built around this separation:

```txt
Complaint = original customer issue
Ticket = internal agent handling work
Quick Response Session = response composition/action session
Action Request = manager-level grouped issue
Document = support knowledge source
AI = optional assistant
Dashboard = read-only operational summary
```

When unsure, protect this separation first.
