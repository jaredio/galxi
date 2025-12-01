# Galxi Backend (API + Postgres)

Minimal Fastify + Prisma service to store Galxi workspaces. No personal data is committed; a fresh DB is created per install.

## Setup
1. `cd backend`
2. `cp .env.example .env` and adjust `DATABASE_URL`, `PORT`, `CORS_ORIGIN`.
3. Install deps: `npm install`
4. Generate client: `npm run prisma:generate`
5. Apply schema: `npm run prisma:push` (or `npm run prisma:migrate` when migrations exist)
6. Seed optional sample workspace: `npm run seed`
7. Run dev API: `npm run dev`

## API (initial)
- `GET /health` — service status
- `GET /workspaces` — list workspaces
- `POST /workspaces` — create workspace `{ name?: string }`
- `GET /workspaces/:id` — workspace with nodes/groups/links
- `PUT /workspaces/:id` — replace graph `{ name?, nodes?, groups?, links? }`

Graph payload fields:
- Node: `{ id, type, label, x, y, groupId?, profile? }`
- Group: `{ id, type, title, x, y, width, height, profile? }`
- Link: `{ id, sourceId, targetId, relation? }`

## Notes
- Postgres only; no secrets in repo. `.env` is ignored.
- Future Docker: run Postgres + API, then migrations/seed on container start for a fresh instance.***
