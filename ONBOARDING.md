# ONBOARDING — Real Estate Ops Desk

Cold-start manual for picking up this repo. Read once, then work.

Live: https://realestate-portal-ten.vercel.app ·
Repo: github.com/Sammysystems/realestate-portal

## 1. What you're working on

Single-admin ops dashboard for a real-estate agency: property catalogue,
inquiry pipeline with SLA clocks, land-search (C of O) stage tracking,
inspections, follow-ups, and a full email-dispatch log. React SPA (static) +
Vercel serverless `api/*` + InsForge Postgres + Resend SMTP. No cron — every
"overdue" thing is computed live and dispatched on demand.

## 2. Prerequisites

- Node 20+
- Vercel CLI (`npm i -g vercel`), logged in, project linked
- InsForge project (SQL access) — CLI reads `.insforge/project.json`
- Resend account with a verified sending domain (or any SMTP)
- Optional: OpenRouter key (AI wording polish only; deterministic without it)

## 3. Local setup

```bash
npm install
cp .env.example .env.local      # fill every placeholder — see §4
npx -y @insforge/cli db migrations up --all
npm run dev                     # http://localhost:3000
npm run lint                    # tsc --noEmit — run before every push
npm run build                   # vite build
```

The dashboard asks for the admin token on first load; it's stored in
`localStorage` under `rep_admin_token` and sent as `Authorization: Bearer …`
on every API call. Same token works with curl.

## 4. Environment variables (`.env.local`)

| Key | Needed | Purpose |
| --- | --- | --- |
| `INSFORGE_URL` | yes | Postgres endpoint |
| `INSFORGE_API_KEY` | yes | server-side key |
| `SMTP_HOST/PORT/USER/PASS` | yes | outbound mail (Resend SMTP) |
| `EMAIL_FROM` | yes | From header |
| `REP_ADMIN_TOKEN` | yes | the single admin credential |
| `APP_URL` | yes | links inside auto-replies |
| `REP_DEMO_INBOX` | optional | demo redirect — see §8 |
| `OPENROUTER_API_KEY` + `OPENROUTER_CHAT_MODEL` | optional | AI polish layer |
| `SEED_ENABLED` | optional | `"true"` unlocks `POST /api/seed` |

`.env.local` is git-ignored and must never be committed. Placeholders live in
`.env.example` only.

## 5. Data model (`migrations/`)

Five lowercase `rep_*` tables — all safe to re-run:

- `rep_property` — catalogue (+ `image_url` column, later migration)
- `rep_inquiry` — leads, `status`, `first_reply_sent_at` (+ `message`)
- `rep_deal` — land-search stages: `search_stage`, `docs`, `last_updated_at`
- `rep_inspection` — `scheduled_for`, `status`
- `rep_emaillog` — every dispatch: `kind`, `recipient`, `subject`, `body`,
  `dispatched`, `note`

Migration files are ordered `timestamp_name.sql`. Create new ones with
`npx -y @insforge/cli db migrations new <name>`, then `… migrations up --all`.

## 6. API (all under `api/`)

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/board` | GET | admin | full board: computed lists + due-sets + stats |
| `/api/inquire` | POST | public | website intake → save → auto first-reply → log |
| `/api/properties` | GET/POST/PATCH | admin | catalogue CRUD |
| `/api/deals` | GET/POST/PATCH | admin | land-search stages + touch (resets stall clock) |
| `/api/inspections` | GET/POST/PATCH | admin | bookings + status |
| `/api/actions` | POST | admin | `follow-ups` \| `overdue-alerts` \| `reminders` |
| `/api/seed` | POST | admin + `SEED_ENABLED=true` | demo fixture |

Everything except `/api/inquire` requires the Bearer token. `_lib/` holds
shared code: `db`, `auth`, `cors`, `mail`, `compute` (all SLA logic),
`reply` (auto-reply).

## 7. Business rules (all in `api/_lib/compute.ts`)

- **First reply:** 4h SLA — unanswered inquiries past 4h flagged
- **Follow-up owed:** open inquiry with no outbound email in 24h+
- **Deal stage SLAs** (days since `last_updated_at`): `new` 3 · `search` 5 ·
  `docs` 7 · `consent` 10 · `exchange` 14 — overdue alerts re-armed every 24h
- **Inspection reminders:** unconfirmed inside 24h, confirmed inside 6h

Due-lists are computed at render time; `POST /api/actions` dispatches
synchronously and logs each send.

## 8. Email modes

- `REP_DEMO_INBOX` **set** → every send is delivered to that inbox instead of
  the real recipient (demo mode — lets you exercise the whole flow with a
  verified address).
- Unset → real delivery to the inquiry's email.
- Resend rejects unverified domains and placeholder addresses
  (`.example.com`, `.test`) — set `REP_DEMO_INBOX` to a real inbox when
  testing.

## 9. Seeding the demo

```bash
curl -X POST https://<site>.vercel.app/api/seed \
  -H "Authorization: Bearer <REP_ADMIN_TOKEN>"
```

Requires `SEED_ENABLED=true`. Wipes and reinserts: 26 properties (with
`public/properties/*.jpg` photos), 34 inquiries, 14 deals, 16 inspections,
48 email-log rows — timestamps relative to *now* so the board always reads
like a live "today". Response includes per-table row counts — **verify them**;
silently dropped inserts are how data bugs hide.

## 10. Deploy workflow

1. `npm run lint` + `npm run build` (both must pass)
2. commit + push to `master`
3. `vercel --prod --yes` from the project root
4. Schema changed → run migrations (`db migrations up --all`)
5. Fixture changed → reseed (§9)

Env vars are set once in the Vercel dashboard — same keys as `.env.local`.

## 11. Conventions & gotchas (learned the hard way)

- **ESM imports in `api/` need explicit `.js` extensions** even though the
  source is `.ts` (`import { db } from './_lib/db.js'`). TypeScript accepts
  extensionless; Vercel's runtime does not — you get 500s only after deploy.
- **Schema changes touch four places:** the migration, `api/seed.ts`, the
  `Property` type in `api/_lib/compute.ts`, and `src/types.ts`. The SDK drops
  unknown-column inserts without erroring — always reseed and check counts.
- **Deterministic reply discipline (`_lib/reply.ts`):** facts (title, price,
  status, agent) come from the DB row only; the LLM rewrites wording and is
  skipped silently on any error/timeout/missing key. Never let the model
  generate facts.
- **No cron, by design.** Due-lists computed at render, dispatch on demand.
  Production path is a cron calling `api/actions` — same endpoint.
- **Charts are hand-rolled** (`src/components/charts.tsx`) — no chart deps.
  Design tokens (forest/linen/ochre, Tailwind v4 `@theme`) live in
  `src/index.css`; serif is reserved for page titles and stat numerals.
- **QC by measurement, not vibes.** Screenshot desktop (1440) and mobile (390)
  via Playwright; mobile overflow must be 0
  (`document.documentElement.scrollWidth - innerWidth`). Vision passes on
  contact sheets have hallucinated "clipped text" — confirm any clip claim
  with a DOM check (`scrollWidth` vs `clientWidth` per element) before
  touching code.

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| All `api/*` 500 after deploy | extensionless ESM imports | add `.js` to relative imports in `api/` |
| Seed returns ok, board empty | unknown column silently dropped | columns match schema? reseed, check counts |
| 401 on every admin call | token mismatch | `REP_ADMIN_TOKEN` must match what you send as Bearer |
| Emails fail to send | Resend rejects recipient/domain | set `REP_DEMO_INBOX` to a real inbox |
| Property photos 404 | `image_url` missing extension or file | must point at a real file in `public/properties/` |
| Layout "looks clipped" on mobile | verify before fixing | DOM overflow/clip audit, not screenshots |
