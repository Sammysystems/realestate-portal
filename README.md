# Real Estate Ops Desk

One screen for a real-estate agency: properties, inquiries, land-search (C of O)
pipelines, inspections and follow-ups — with the money-eating stalls visible the
moment they happen.

## What it does

- **Inquiry pipeline with a response clock** — every lead shows how long it's sat,
  and anything unanswered past 4 hours is flagged.
- **Auto first-reply** — submitting an inquiry fires an email instantly. Facts
  (property, price, status, agent) always come from the database; the LLM only
  polishes wording, and the deterministic reply stands if the model is off,
  slow, or absent. No hallucination is possible by construction.
- **Land-search board** — each deal's title/C-of-O stage with a per-stage SLA.
  Stalled deals are flagged with days overdue.
- **Inspections** — bookings with confirm / reminder / done states.
- **Follow-up center** — open inquiries with no touch in 24h+ are computed live.
- **Email log** — every dispatch recorded (kind, recipient, subject, state).

### Fire-on-click, not fire-on-a-clock

Nothing here is scheduled. "Overdue alerts", "follow-up runs" and "inspection
reminders" are **on-screen buttons**: they compute what is owed live and dispatch
the emails synchronously. The whole system demos end-to-end in one sitting.

> Production hardening path (not in this build): a cron on `api/actions` firing
> the same endpoints on a schedule, and webhook intake instead of the form.

## Stack

- React + Vite + Tailwind (frontend, static)
- Vercel serverless `api/*` (the endpoints below)
- InsForge Postgres (shared backend, lowercase `rep_*` tables)
- OpenRouter (optional wording polish only — deterministic fallback)
- SMTP via Resend (nodemailer)

## API

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/board` | GET | admin | full board: computed lists + "due now" sets + stats |
| `/api/inquire` | POST | public | intake → saves inquiry → auto first-reply → log |
| `/api/properties` | GET/POST/PATCH | admin | catalogue CRUD |
| `/api/deals` | GET/POST/PATCH | admin | land-search stages + touch (resets stall clock) |
| `/api/inspections` | GET/POST/PATCH | admin | bookings + status |
| `/api/actions` | POST | admin | `follow-ups` \| `overdue-alerts` \| `reminders` sync dispatch |
| `/api/seed` | POST | admin + `SEED_ENABLED` | demo fixture (relative timestamps) |

## Run it

```bash
npm install
cp .env.example .env.local   # fill from your InsForge/SMTP/OpenRouter keys
npx tsc --noEmit
npm run build
```

Apply `migrations/001_create_tables.sql` in the InsForge SQL editor, then:

```bash
vercel --prod --yes
# set the .env.local values as Vercel env vars, REP_ADMIN_TOKEN + SEED_ENABLED=true
curl -X POST https://<site>.vercel.app/api/seed -H "Authorization: Bearer <token>"
```

Seed data uses timestamps relative to *now*, so the board always reads like a
live "today": a 6-hour-unanswered hot inquiry, a land search stalled 17 days,
inspections tomorrow, follow-ups owed.