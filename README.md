# AgentKid MVP foundation

AgentKid is a self-contained Next.js application for a parent-managed, child-safe learning companion.
The foundation includes SQLite persistence, signed cookie authentication, parent ownership controls, admin content CRUD, sessions, chat, progress, and safety alerts.

## Run locally

Node.js 24 or newer and pnpm are required.

```bash
pnpm install
copy .env.example .env.local
pnpm db:init
pnpm dev
```

Open `http://localhost:3000`.
The local SQLite file is created at `.data/agentkid.db` and is ignored by Git.
Schema migrations apply automatically when the database is opened.
Set `SESSION_SECRET` to a long random value outside local development.

Demo credentials:

- Parent: `parent@agentkid.local` / `Parent123!`
- Admin: `admin@agentkid.local` / `Admin123!`

## Optional AI provider

Chat works without network access through a deterministic child-safe fallback.
To use an OpenAI-compatible provider, set `OPENAI_API_KEY`, and optionally `OPENAI_BASE_URL` and `OPENAI_MODEL`.
Provider requests time out after five seconds and fall back safely on any error.
Input and output are checked by deterministic safety rules.

## API

- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Children: `GET/POST /api/children`, `GET/PATCH/DELETE /api/children/:id`
- Sessions: `POST /api/sessions`, `GET /api/sessions/:id` (returns the persisted transcript), `POST /api/sessions/:id/end`
- Chat: `POST /api/chat` with `{ "sessionId": 1, "content": "..." }`
- Child lessons: `GET /api/children/:id/lessons`, `POST /api/children/:id/lessons/:lessonId/complete`
- Child routines: `GET /api/children/:id/routines`, `POST /api/children/:id/routines/:routineId/steps/:stepId/complete`
- Child emotion check-in: `POST /api/children/:id/emotion` with `{ "emotion": "calm", "note": "..." }`
- Child memories: `GET /api/children/:id/memories`, `DELETE /api/children/:id/memories/:memoryId`
- Progress: `GET /api/children/:id/progress` (lessons, routines, recent emotion check-ins, recent sessions, alert count)
- Alerts: `GET /api/alerts`, `PATCH /api/alerts/:id`
- Admin lessons: `GET/POST /api/admin/lessons`, `PATCH/DELETE /api/admin/lessons/:id`
- Admin routines: `GET/POST /api/admin/routines`, `PATCH/DELETE /api/admin/routines/:id`

All endpoints return either `{ "data": ... }` or `{ "error": { "message": "..." } }` with a matching status code.
Child-derived reads (children, progress, lessons, routines, memories, session transcripts) are visible to the owning parent and admins.
Child actions (lesson/step completion, emotion check-in, memory deletion, chat) are restricted to the owning parent; admins and other parents receive `404` so record existence never leaks.
Admin content endpoints require the admin role.

### Semantics

- Lesson and routine-step completion are idempotent `POST`s: repeating a call never creates duplicate rows and never moves the original completion timestamp. Step completion is rejected with `404` unless the step belongs to the given routine.
- `DELETE /api/children/:id/memories/:memoryId` is not idempotent by design: an unknown or unowned memory returns `404`.
- `PATCH /api/alerts/:id` acknowledges an alert idempotently (the first acknowledgement time and actor are kept).
- Malformed JSON, non-positive or non-numeric ids, unknown enum values and out-of-range fields return `400`.

### Chat safety and provider

`POST /api/chat` authenticates the parent, verifies session/child ownership, stores exactly one user and one assistant message, and applies deterministic safety checks to both the input and the provider output.
A risky side persists a single `safety_events` row per `(session, source, content)`; repeated identical risky content never duplicates an event, and unsafe provider output is replaced by the deterministic safe fallback before it is stored.
The response `provider` field is honest: `openai-compatible`, `fallback` (no key or provider failure), or `safety-fallback`.
The optional provider call bounds input, history and output, sends a fixed child-safe system prompt, aborts after five seconds or when the request is aborted, and falls back deterministically on non-2xx or invalid shapes.

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The tests use temporary on-disk SQLite databases and require no separate server or external service.
