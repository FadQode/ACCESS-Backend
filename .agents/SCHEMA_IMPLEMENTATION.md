# SCHEMA_IMPLEMENTATION.md

# ACCESS Backend Database Schema Plan

## 1. Goal

Build the initial PostgreSQL database schema for the ACCESS backend.

This schema should support the core business workflow:

```txt
Complaint Intake
→ Quick Response
→ Ticket Handling if Follow-up is Needed
→ Manager Action Queue
→ Take Action Resolution
→ Reference Lookup
→ History & Metrics
```

The schema must support two main complaint-handling paths:

```txt
Path A:
Complaint
→ Quick Response with valid HEAT
→ Resolved directly
→ No ticket required

Path B:
Complaint
→ Quick Response with HEA only
→ Ticket created
→ Action Request created or linked
→ Manager provides Take Action
→ Agent sends closure
→ Resolved
```

AI/RAG-related tables are postponed. The system should still support reference lookup using normal database tables, categories, tags, source types, and search fields.

The term **reference** is used instead of **document** because the source of information may be:

```txt
SOP
FAQ
policy
guide
template
known issue
external link
uploaded file
previous action
internal note
```

---

## 2. Stack Assumption

```txt
Runtime: Bun
Backend Framework: Elysia
Database: PostgreSQL
ORM: Drizzle ORM
Migration Tool: Drizzle Kit
Seeder: Bun script
```

---

## 3. Database Folder Structure

Create this database structure:

```txt
src/
  db/
    index.ts
    schema/
      index.ts
      users.schema.ts
      complaints.schema.ts
      tickets.schema.ts
      quick-response.schema.ts
      action-requests.schema.ts
      references.schema.ts
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
      references.seed.ts
      ticket-events.seed.ts
      agent-performance.seed.ts
```

Do not create `documents.schema.ts` for v1. The reference system replaces the old document system.

---

## 4. Schema Build Order

Build the schema in this order to avoid foreign key dependency issues:

```txt
1. users
2. complaints
3. tickets
4. quick_response_sessions
5. action_requests
6. action_request_complaints
7. reference_sources
8. reference_tags
9. reference_source_tags
10. quick_response_references
11. action_request_references
12. ticket_events
13. audit_logs
14. agent_performance
```

---

# Phase 1 — Database Setup

## 1. Install dependencies

Install the required packages:

```bash
bun add drizzle-orm postgres dotenv
bun add -d drizzle-kit
```

Optional but recommended:

```bash
bun add zod
```

---

## 2. Create environment file

Create `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/access_db
```

---

## 3. Create Drizzle config

Create `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## 4. Create database client

Create:

```txt
src/db/index.ts
```

Purpose:

```txt
- Load DATABASE_URL
- Create PostgreSQL client
- Export Drizzle database instance
```

---

# Phase 2 — Schema Files

## 1. `users.schema.ts`

Create the `users` table.

Purpose:

```txt
Stores internal ACCESS users:
- agent
- manager
- admin
```

Fields:

```txt
id
name
email
password_hash
role
is_active
created_at
updated_at
```

Enums:

```txt
user_role:
- agent
- manager
- admin
```

Important constraints:

```txt
email unique
role required
is_active default true
```

Indexes:

```txt
email
role
is_active
```

---

## 2. `complaints.schema.ts`

Create the `complaints` table.

Purpose:

```txt
Stores original customer complaints from public form or external channels.
```

Important concept:

```txt
Complaint = original passenger/customer issue.
```

A complaint does not always become a ticket.

If a valid HEAT response is available, the complaint may be resolved directly through Quick Response.

If only HEA is available and Take Action is needed, the complaint must be turned into a ticket and linked to a manager action request.

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

Status meaning:

```txt
submitted:
Complaint has entered the system.

waiting_action:
HEA has been sent and the complaint is waiting for Take Action from manager/action request.

resolved:
A valid Take Action exists and the customer has been given resolution/closure.

closed:
Case is administratively closed.
```

Important constraints:

```txt
reference_no unique
tracking_token unique
complaint_text required
category required
status default submitted
```

Indexes:

```txt
reference_no
tracking_token
source
category
status
submitted_at
```

---

## 3. `tickets.schema.ts`

Create the `tickets` table.

Purpose:

```txt
Stores internal agent work items created from complaints.
```

Important concept:

```txt
Ticket = internal work item for agent follow-up.
```

A ticket is created when a complaint needs internal tracking, especially when HEA is sent but Take Action is not yet available.

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

Enums:

```txt
ticket_status:
- open
- hea_sent
- waiting_manager_action
- manager_action_done
- ready_to_close
- closed
```

```txt
ticket_priority:
- low
- medium
- high
- urgent
```

Important constraints:

```txt
complaint_id references complaints.id
agent_id references users.id nullable
complaint_id unique
status default open
priority default medium
```

Reason for unique `complaint_id`:

```txt
One complaint may become zero or one ticket in v1.
```

Indexes:

```txt
complaint_id
agent_id
status
priority
created_at
```

---

## 4. `quick-response.schema.ts`

Create the `quick_response_sessions` table.

Purpose:

```txt
Stores agent response-composition sessions for complaints.
```

Important concept:

```txt
Quick Response Session = one response attempt/action by an agent.
```

A quick response session may represent:

```txt
HEAT response that resolves the complaint
HEA response that triggers manager Take Action
Draft/copy-only response
Closure response after manager action is done
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
- saved_ticket
- escalated
- copy_only
```

Outcome meaning:

```txt
sent_resolved:
Agent sent a valid HEAT/final closure and the complaint can be resolved.

sent_hea_action:
Agent sent HEA only. Backend must create ticket and create/link action request.

saved_ticket:
Complaint is saved as ticket, but not necessarily escalated yet.

escalated:
Complaint is escalated to manager/action request.

copy_only:
Agent copied the response draft without changing the official workflow.
```

Important constraints:

```txt
agent_id references users.id
complaint_id references complaints.id
ticket_id references tickets.id nullable
outcome required
```

Reason for nullable `ticket_id`:

```txt
Quick Response can happen before a complaint becomes a ticket.
A directly resolved complaint may never have a ticket.
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

## 5. `action-requests.schema.ts`

Create two tables:

```txt
action_requests
action_request_complaints
```

---

### `action_requests`

Purpose:

```txt
Stores manager-level grouped issues/action queues.
```

Important concept:

```txt
Action Request = manager-level grouped issue that provides Take Action.
```

Managers do not primarily handle individual tickets one by one. They handle clusters/groups of similar complaints.

Fields:

```txt
id
manager_id
reference_no
cluster_label
category
status
issue_summary
action_taken
closure_message
raised_at
resolved_at
created_at
updated_at
```

Enums:

```txt
action_request_status:
- open
- reviewing
- action_planned
- action_taken
- closed
```

Status meaning:

```txt
open:
Cluster is created and waiting for manager review.

reviewing:
Manager is reviewing the issue.

action_planned:
Manager has planned or coordinated an action.

action_taken:
Take Action is available and can be used for final closure.

closed:
Manager action request is administratively closed.
```

Important constraints:

```txt
manager_id references users.id nullable
reference_no unique
category required
status default open
```

Reason for nullable `manager_id`:

```txt
An action request may exist before it is assigned to a manager.
```

Indexes:

```txt
reference_no
manager_id
category
status
raised_at
```

---

### `action_request_complaints`

Purpose:

```txt
Join table for grouping many complaints/tickets into one manager action request.
```

Important concept:

```txt
One action request can cover many complaints and tickets.
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

Important constraints:

```txt
action_request_id references action_requests.id
complaint_id references complaints.id
ticket_id references tickets.id nullable
agent_id references users.id nullable
unique(action_request_id, complaint_id)
```

Reason:

```txt
Managers handle grouped issues, not individual tickets one by one.
```

Indexes:

```txt
action_request_id
complaint_id
ticket_id
agent_id
```

---

## 6. `references.schema.ts`

Create five tables:

```txt
reference_sources
reference_tags
reference_source_tags
quick_response_references
action_request_references
```

This replaces the old document schema.

Do not create these old tables in v1:

```txt
context_documents
document_tags
context_document_tags
document_references
```

---

### `reference_sources`

Purpose:

```txt
Stores all reusable sources of information.
```

Important concept:

```txt
Reference Source = any source that can support a response or manager action.
```

A reference source is not always a document.

It can be:

```txt
SOP
FAQ
policy
guide
template
known issue
external link
uploaded file
previous action
internal note
```

Fields:

```txt
id
created_by
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
created_at
updated_at
```

Enums:

```txt
reference_source_type:
- sop
- faq
- policy
- guide
- template
- known_issue
- external_link
- uploaded_file
- previous_action
- internal_note
```

```txt
reference_status:
- active
- draft
- archived
```

Important constraints:

```txt
created_by references users.id
source_type required
title required
status default active
```

Purpose of `search_text`:

```txt
Simple searchable text for v1 reference lookup before RAG exists.
```

Purpose of `metadata`:

```txt
Stores flexible extra information, such as original source table,
external provider, file metadata, previous action ID, or display hints.
```

Indexes:

```txt
created_by
source_type
category
status
title
```

---

### `reference_tags`

Purpose:

```txt
Stores reusable tags for reference sources.
```

Example tags:

```txt
refund
payment_failed
saldo_terpotong
ticket_not_issued
delay
cancellation
app_error
facility
lost_item
gateway_timeout
closure_template
```

Fields:

```txt
id
name
created_at
```

Important constraints:

```txt
name unique
```

Indexes:

```txt
name
```

---

### `reference_source_tags`

Purpose:

```txt
Many-to-many join table between reference sources and tags.
```

Fields:

```txt
reference_source_id
tag_id
```

Important constraints:

```txt
reference_source_id references reference_sources.id
tag_id references reference_tags.id
unique(reference_source_id, tag_id)
```

Reason:

```txt
One reference source can have many tags.
One tag can be used by many reference sources.
```

---

### `quick_response_references`

Purpose:

```txt
Records which reference sources were used in a Quick Response session.
```

Important concept:

```txt
This answers:
"Which references were used by the agent to create this HEA/HEAT response?"
```

This table supports cases where a complaint is resolved directly without becoming a ticket.

Fields:

```txt
id
quick_response_session_id
reference_source_id
referenced_by
usage_type
relevance_score
snapshot_text
note
created_at
```

Enums:

```txt
quick_response_reference_usage:
- response_basis
- template_used
- policy_support
- known_issue
- previous_resolution
- action_closure
```

Important constraints:

```txt
quick_response_session_id references quick_response_sessions.id
reference_source_id references reference_sources.id
referenced_by references users.id
usage_type required
```

Purpose of `snapshot_text`:

```txt
Stores a copy of the reference content at the time it was used.
This preserves history even if the original reference source changes later.
```

Purpose of `relevance_score`:

```txt
Optional score for future search/RAG ranking.
Can be null in v1.
```

Indexes:

```txt
quick_response_session_id
reference_source_id
referenced_by
usage_type
```

---

### `action_request_references`

Purpose:

```txt
Records which reference sources were attached to a manager action request.
```

Important concept:

```txt
This answers:
"Which evidence/link/SOP/note supports this manager Take Action?"
```

This table attaches references to the cluster/action request, not to individual tickets.

Fields:

```txt
id
action_request_id
reference_source_id
attached_by
usage_type
snapshot_text
note
created_at
```

Enums:

```txt
action_request_reference_usage:
- evidence
- action_basis
- policy_support
- closure_support
- related_link
- internal_note
```

Important constraints:

```txt
action_request_id references action_requests.id
reference_source_id references reference_sources.id
attached_by references users.id
usage_type required
```

Purpose of `snapshot_text`:

```txt
Stores a copy of the reference content at the time it was attached.
This preserves manager action history even if the original reference changes later.
```

Indexes:

```txt
action_request_id
reference_source_id
attached_by
usage_type
```

---

## 7. `ticket-events.schema.ts`

Create the `ticket_events` table.

Purpose:

```txt
Stores ticket timeline/history.
```

Fields:

```txt
id
ticket_id
actor_id
event_type
note
metadata
created_at
```

Enums:

```txt
ticket_event_type:
- created
- assigned
- hea_sent
- escalated
- manager_action_linked
- manager_action_done
- resolved
- closed
- reopened
```

Important constraints:

```txt
ticket_id references tickets.id
actor_id references users.id nullable
event_type required
```

Reason for nullable `actor_id`:

```txt
Some events may be system-generated later.
```

Indexes:

```txt
ticket_id
actor_id
event_type
created_at
```

---

## 8. `audit-logs.schema.ts`

Create the `audit_logs` table.

Purpose:

```txt
Stores system-level accountability logs.
```

Fields:

```txt
id
actor_id
entity_type
entity_id
action
before_json
after_json
created_at
```

Important constraints:

```txt
actor_id references users.id nullable
entity_type required
entity_id required
action required
```

Notes:

```txt
entity_type + entity_id is a polymorphic reference.
It can point to complaints, tickets, quick_response_sessions,
action_requests, reference_sources, users, etc.
```

Indexes:

```txt
actor_id
entity_type
entity_id
action
created_at
```

---

## 9. `agent-performance.schema.ts`

Create the `agent_performance` table.

Purpose:

```txt
Stores derived monthly agent performance snapshots.
```

Fields:

```txt
id
agent_id
period_month
period_year
complaints_resolved
escalations_count
avg_first_response_min
avg_resolution_hrs
quality_score
compliance_responded_before_action
compliance_referenced_issue
compliance_action_on_close
compliance_first_reply_under_1h
compliance_no_sla_breach
calculated_at
```

Important constraints:

```txt
agent_id references users.id
unique(agent_id, period_month, period_year)
```

Important note:

```txt
This table is derived data.
It should not become the source of truth for workflow.
```

Source of truth should remain:

```txt
complaints
tickets
quick_response_sessions
action_requests
action_request_complaints
ticket_events
```

---

# Phase 3 — Relations File

Create:

```txt
src/db/schema/relations.ts
```

Purpose:

```txt
Define Drizzle relations between tables.
```

Relations to define:

```txt
users → tickets
users → quick_response_sessions
users → action_requests
users → action_request_complaints
users → reference_sources
users → quick_response_references
users → action_request_references
users → ticket_events
users → audit_logs
users → agent_performance

complaints → tickets
complaints → quick_response_sessions
complaints → action_request_complaints

tickets → complaints
tickets → users
tickets → quick_response_sessions
tickets → action_request_complaints
tickets → ticket_events

quick_response_sessions → users
quick_response_sessions → complaints
quick_response_sessions → tickets
quick_response_sessions → quick_response_references

action_requests → users
action_requests → action_request_complaints
action_requests → action_request_references

action_request_complaints → action_requests
action_request_complaints → complaints
action_request_complaints → tickets
action_request_complaints → users

reference_sources → users
reference_sources → reference_source_tags
reference_sources → quick_response_references
reference_sources → action_request_references

reference_tags → reference_source_tags

reference_source_tags → reference_sources
reference_source_tags → reference_tags

quick_response_references → quick_response_sessions
quick_response_references → reference_sources
quick_response_references → users

action_request_references → action_requests
action_request_references → reference_sources
action_request_references → users
```

---

# Phase 4 — Migration

## 1. Export schema index

Create:

```txt
src/db/schema/index.ts
```

Export every schema file:

```ts
export * from "./users.schema";
export * from "./complaints.schema";
export * from "./tickets.schema";
export * from "./quick-response.schema";
export * from "./action-requests.schema";
export * from "./references.schema";
export * from "./ticket-events.schema";
export * from "./audit-logs.schema";
export * from "./agent-performance.schema";
export * from "./relations";
```

---

## 2. Generate migration

Run:

```bash
bun run db:generate
```

Expected result:

```txt
Drizzle creates SQL migration files under src/db/migrations or configured migrations folder.
```

---

## 3. Apply migration

Run:

```bash
bun run db:migrate
```

Expected result:

```txt
All database tables, enums, indexes, and foreign keys are created.
```

---

# Phase 5 — Seeders

Create seeders to support development and demo.

## 1. Seeder entry point

Create:

```txt
src/db/seed/index.ts
```

Seeder order:

```txt
1. users
2. complaints
3. tickets
4. quick_response_sessions
5. action_requests
6. action_request_complaints
7. reference_sources
8. reference_tags
9. reference_source_tags
10. quick_response_references
11. action_request_references
12. ticket_events
13. agent_performance
```

---

## 2. `users.seed.ts`

Seed:

```txt
1 admin
2 managers
5 agents
```

Example users:

```txt
admin@access.test
manager1@access.test
manager2@access.test
agent1@access.test
agent2@access.test
agent3@access.test
agent4@access.test
agent5@access.test
```

Use a simple default password for development only:

```txt
password123
```

Hash the password before insert.

---

## 3. `complaints.seed.ts`

Seed complaints from multiple channels:

```txt
web_form
twitter
instagram
google_play
app_store
```

Example complaints:

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

Seed at least two categories of complaints:

```txt
1. Complaints resolved directly with HEAT
2. Complaints requiring HEA + manager Take Action
```

---

## 4. `tickets.seed.ts`

Create tickets from some complaints only.

Not every complaint should become a ticket.

Create tickets mainly for complaints that need manager Take Action.

Seed mixed statuses:

```txt
open
hea_sent
waiting_manager_action
manager_action_done
ready_to_close
closed
```

---

## 5. `quick-response.seed.ts`

Create quick response sessions for several complaints.

Include different outcomes:

```txt
sent_resolved
sent_hea_action
saved_ticket
escalated
copy_only
```

Seed selected response parts:

```txt
selected_hear
selected_empathize
selected_apologize
selected_take_action
final_response
```

Important seed rule:

```txt
If outcome = sent_resolved, selected_take_action should be filled.
If outcome = sent_hea_action, selected_take_action may be null and ticket/action request should exist.
```

---

## 6. `action-requests.seed.ts`

Create manager action groups.

Example clusters:

```txt
Payment deducted but ticket not issued
App cancellation failure
Delay notification issue
Station facility issue
```

Link multiple complaints to the same action request using `action_request_complaints`.

This is important because manager queue should demonstrate grouped complaint handling.

---

## 7. `references.seed.ts`

Seed reference sources.

Example reference sources:

```txt
SOP Refund Saldo Terpotong
FAQ Pembatalan Tiket
Panduan Menangani Keluhan Delay
Template Respon App Review
Known Issue Payment Gateway Timeout
Panduan Barang Tertinggal
Previous Action: Payment Gateway Timeout 25 Mei
Internal Note: Refund Batch Coordination
External Link: Payment Gateway Incident Report
```

Use varied source types:

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

Create reference tags:

```txt
refund
payment_failed
saldo_terpotong
ticket_not_issued
delay
cancellation
app_error
lost_item
facility
gateway_timeout
closure_template
```

Attach tags to reference sources using `reference_source_tags`.

Seed quick response references:

```txt
quick_response_references
```

Examples:

```txt
A directly resolved HEAT answer uses FAQ Refund.
A HEA initial response uses Template Respon App Review.
A closure response uses Previous Action Payment Gateway Timeout.
```

Seed action request references:

```txt
action_request_references
```

Examples:

```txt
Payment deducted cluster uses Payment Gateway Incident Report.
Cancellation failure cluster uses SOP Pembatalan Tiket.
Delay notification cluster uses internal coordination note.
```

---

## 8. `ticket-events.seed.ts`

Create event history for seeded tickets.

Example events:

```txt
created
assigned
hea_sent
escalated
manager_action_linked
manager_action_done
closed
```

---

## 9. `agent-performance.seed.ts`

Seed one or two monthly performance snapshots for each agent.

Use realistic demo values.

Example metrics:

```txt
complaints_resolved
escalations_count
avg_first_response_min
avg_resolution_hrs
quality_score
```

---

# Phase 6 — Package Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "bun run src/db/seed/index.ts"
  }
}
```

---

# Phase 7 — Validation Checklist

After migration, verify these tables exist:

```txt
users
complaints
tickets
quick_response_sessions
action_requests
action_request_complaints
reference_sources
reference_tags
reference_source_tags
quick_response_references
action_request_references
ticket_events
audit_logs
agent_performance
```

Verify these old tables do not exist in v1:

```txt
context_documents
document_tags
context_document_tags
document_references
rag_sources
rag_chunks
rag_retrievals
```

Verify these constraints:

```txt
users.email unique
complaints.reference_no unique
complaints.tracking_token unique
tickets.complaint_id unique
action_requests.reference_no unique
action_request_complaints unique(action_request_id, complaint_id)
reference_tags.name unique
reference_source_tags unique(reference_source_id, tag_id)
agent_performance unique(agent_id, period_month, period_year)
```

Verify basic relationships:

```txt
ticket belongs to complaint
ticket may belong to agent
quick response belongs to complaint and agent
quick response may belong to ticket
action request groups many complaints/tickets
reference source can have many tags
quick response can use many references
action request can attach many references
ticket has many events
agent has monthly performance records
```

---

# Phase 8 — Workflow Validation

Validate the schema supports these flows.

## Flow A — Direct HEAT resolution

```txt
Complaint created
Quick response session created
Reference sources used through quick_response_references
quick_response_sessions.outcome = sent_resolved
complaints.status = resolved
No ticket required
No action request required
```

Tables involved:

```txt
complaints
quick_response_sessions
reference_sources
quick_response_references
```

---

## Flow B — HEA only, manager Take Action required

```txt
Complaint created
Quick response session created
Reference sources used through quick_response_references
quick_response_sessions.outcome = sent_hea_action
Ticket created
tickets.status = waiting_manager_action
Complaint updated
complaints.status = waiting_action
Action request created or found
Complaint/ticket linked through action_request_complaints
```

Tables involved:

```txt
complaints
quick_response_sessions
quick_response_references
reference_sources
tickets
action_requests
action_request_complaints
```

---

## Flow C — Manager provides Take Action

```txt
Manager updates action_requests.action_taken
Manager updates action_requests.closure_message
Manager attaches references through action_request_references
action_requests.status = action_taken
Linked tickets move to manager_action_done
```

Tables involved:

```txt
action_requests
action_request_complaints
action_request_references
reference_sources
tickets
```

---

## Flow D — Agent sends final closure

```txt
Agent creates final quick_response_session
selected_take_action uses manager closure/action
quick_response_references records references used
quick_response_sessions.outcome = sent_resolved
complaints.status = resolved
tickets.status = closed
```

Tables involved:

```txt
quick_response_sessions
quick_response_references
reference_sources
complaints
tickets
```

---

# Phase 9 — What Not To Build Yet

Do not build these tables in v1:

```txt
rag_sources
rag_chunks
rag_retrievals
embedding_jobs
ml_inference_logs
agent_planning_steps
```

Reason:

```txt
The current backend should focus on business workflow first.
Reference lookup is enough for v1.
RAG and ML can be added later after the workflow is stable.
```

---

# Phase 10 — Future Extension Notes

When AI/RAG becomes necessary, add a separate retrieval layer.

Possible future tables:

```txt
rag_sources
rag_chunks
rag_retrievals
```

Possible future sources:

```txt
reference_sources
resolved_tickets
manager-approved action requests
approved quick response sessions
known issues
```

Important future rule:

```txt
RAG should retrieve from a controlled knowledge layer,
not freely query every operational table.
```

---

# Final Notes

The database should protect this separation:

```txt
Complaint = original passenger issue
Quick Response Session = response composition/action session
Ticket = internal agent work item when follow-up is needed
Action Request = manager-level grouped issue and source of Take Action
Reference Source = reusable source of information, not only documents
Quick Response Reference = source used in an agent response
Action Request Reference = source/evidence used in manager Take Action
Ticket Event = ticket timeline
Audit Log = accountability record
Agent Performance = derived metric snapshot
```

When unsure, preserve this separation first.
