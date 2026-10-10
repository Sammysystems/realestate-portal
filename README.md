# Real Estate Ops Desk

Agencies don't lose deals in the office. They lose them in the gaps: a lead
waiting nine hours for a first reply, a land search stalled eighteen days
before anyone notices, a follow-up remembered on Friday for a Tuesday inquiry.
Nobody can say who was emailed what, or when.

This system closes those gaps. One screen where every lead carries a clock,
every stall is flagged the day it happens, and the reply goes out before the
buyer moves on to the next listing. And it's not just a board — an assistant
answers questions about the book and drafts the chase.

**Live demo:** https://realestate-portal-ten.vercel.app
(login: any token set as `REP_ADMIN_TOKEN` — seed data included)

## The problem

- **Silent leads.** Website inquiries land in nobody's inbox. By the time
  someone reads the message, the buyer has inquired with three other agencies.
- **Invisible stalls.** A land-search deal sits in "docs" for two weeks. No
  alarm, no list — just a client who quietly stopped calling.
- **Memory-driven follow-ups.** Chasing people happens when someone remembers,
  which means it happens late, or it doesn't happen.
- **No proof.** When a client asks "did you ever email me about that?", the
  answer lives in someone's personal inbox.

## The outcome

- **First reply in minutes, not hours.** Every inquiry triggers an automatic
  email built from the matched property's real price, status and agent. A
  4-hour SLA clock runs on each lead; breaches show up in red on the board.
- **Stalls surface themselves.** Every land-search stage has a day limit
  (new 3 · search 5 · docs 7 · consent 10 · exchange 14). Overdue deals show
  days-over and fire an alert with one click.
- **The board says what's owed today.** Leads untouched for 24h+, deals past
  stage SLA, inspections needing reminders — computed live, dispatched via
  one button each. Nothing owed is ever off-screen.
- **Every send is on record.** Kind, recipient, subject, body, state — a
  dispatch history that includes the failures, not just the wins.

## What's on the board

| View | The question it answers |
| --- | --- |
| Dashboard | How healthy is today? Stat row, reply-speed gauge, 14-day inquiry bars, deal donut, portfolio split |
| Properties | What do we have? Photo cards — price, days on market, status, agent, inquiry count |
| Inquiries | Who's waiting? Pipeline ordered by wait time, SLA breaches flagged |
| Land search | Which deals are stuck? Stage stepper, per-stage SLA, days overdue |
| Inspections | Who's visiting when? Today / tomorrow groups, confirm → remind → done |
| Follow-ups | Who did we forget? Owed lists, one-click dispatch |
| Email log | What actually went out? Full history incl. failed sends |

## Ask the Desk — the grounded assistant

The board is readable; now it's askable. Type a question or send a voice
note, and the desk answers — out loud — and can draft the follow-up for you.

- **Grounded, not guessy.** The server compiles a compact digest of the live
  board (counts, overdue lists, leads waiting) and the model may only read it.
  It cannot query the database, so it cannot invent a price, an agent, or a
  count — a hallucinated number is structurally impossible here, not unlikely.
- **Voice in, voice out.** Send a voice note (server Whisper when
  `GROQ_API_KEY` is set; browser speech recognition otherwise) and hear the
  reply read back (browser speech synthesis). The written answer lands the
  instant speech starts, then reveals word by word.
- **It can act.** Ask it to chase a lead and it returns a drafted email;
  confirm and it sends — logged like every other dispatch.

## How the auto-reply stays honest

Facts never come from the model. The reply is assembled from the matched
database row — title, price, status, location, agent — and an LLM (optional,
OpenRouter) only rewrites the wording. Model down, slow, or missing: the
deterministic reply ships as-is. A hallucinated price is structurally
impossible here, not unlikely.

## Fire-on-click, not fire-on-a-clock

Nothing in this build is scheduled. Follow-up runs, overdue alerts and
inspection reminders are on-screen buttons that compute what is owed *right
now* and dispatch synchronously. The whole system demos end-to-end in one
sitting.

> Production hardening path (deliberately not built): a cron calling
> `api/actions` on a schedule, and webhook intake instead of the form.

## Stack

- React 19 + Vite + Tailwind v4 — hand-rolled SVG charts, zero chart deps
- Vercel serverless `api/*` (10 endpoints)
- Grounded assistant — digest→LLM Q&A (`/api/ask`), speech-to-text
  (`/api/transcribe`), drafted email (`/api/email`)
- Browser-native voice (speech synthesis + recognition); optional Groq Whisper
- InsForge Postgres — lowercase `rep_*` tables, migrations in `migrations/`
- Resend SMTP via nodemailer
- Optional OpenRouter polish (deterministic fallback always ships)

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in InsForge / SMTP / admin token keys
npx -y @insforge/cli db migrations up --all
npm run dev                    # http://localhost:3000
```

Full setup, data model, API reference, SLA rules, deploy workflow and the
gotchas that burned us: **[ONBOARDING.md](./ONBOARDING.md)**
