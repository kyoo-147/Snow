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
- Sessions: `POST /api/sessions`, `GET /api/sessions/:id`, `POST /api/sessions/:id/end`
- Chat: `POST /api/chat` with `{ "sessionId": 1, "content": "..." }`
- Progress: `GET /api/children/:id/progress`
- Alerts: `GET /api/alerts`, `PATCH /api/alerts/:id`
- Admin lessons: `GET/POST /api/admin/lessons`, `PATCH/DELETE /api/admin/lessons/:id`
- Admin routines: `GET/POST /api/admin/routines`, `PATCH/DELETE /api/admin/routines/:id`

All endpoints return either `{ "data": ... }` or `{ "error": { "message": "..." } }`.
Child records are visible only to their owning parent and admins.
Admin content endpoints require the admin role.

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The tests use temporary on-disk SQLite databases and require no separate server or external service.
