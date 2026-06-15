# ACCESS Backend

Backend API for the ACCESS transportation complaint workflow.

## Stack

- Bun
- Elysia
- TypeScript
- PostgreSQL
- Drizzle ORM

## Setup

```bash
cp .env.example .env
bun install
bun run dev
```

The checked-in `.env.example` documents every supported setting. Local secrets
belong in `.env`, which is ignored by Git. Redis and AI are disabled by default
and are not required for core complaint-handling workflows.

The API starts at `http://localhost:3000`. Its versioned health endpoint is:

```txt
GET /api/v1/health
```

Internal seeded users authenticate with bearer JWTs through:

```txt
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

Development users use the password `password123`. Run `bun run db:seed`
after applying migrations to load them.

## API Documentation

Interactive Scalar documentation is available during development at:

```txt
http://localhost:3000/docs
```

The generated OpenAPI JSON document is available at:

```txt
http://localhost:3000/docs/openapi.json
```

Set `OPENAPI_ENABLED=false` to disable both endpoints. Documentation defaults
to disabled in production unless `OPENAPI_ENABLED=true` is explicitly set.
The base documentation path can be changed with `OPENAPI_PATH`.

## Commands

```bash
bun run dev
bun run typecheck
bun test
bun run build
bun run db:generate
bun run db:migrate
```

## Architecture

The project uses feature-based modules:

```txt
src/
  config/       runtime configuration
  db/           Drizzle client, schema, and seeds
  modules/      business features and their internal layers
  plugins/      cross-cutting Elysia plugins
  shared/       small reusable primitives
  app.ts        application composition
  server.ts     process and network lifecycle
```

Business modules follow this internal convention when each layer is needed:

```txt
modules/<feature>/
  <feature>.routes.ts
  <feature>.service.ts
  <feature>.repository.ts
  <feature>.dto.ts
  <feature>.entity.ts
```

The intended implementation order and domain boundaries are documented in
`.agents/AGENTS.MD`.

Current base architecture includes placeholders for:

- `auth`
- `users`
- `complaints`
- `tickets`
- `quick-response`
- `action-requests`
- `documents`
- `dashboard`
- `audit`
- `agent-performance`
- `ai`
