import type { Board } from '../../src/types.js';

// The assistant is grounded, not generative: the server turns the live board into
// one compact "ops digest", and the model is only allowed to read from it. If the
// digest doesn't contain the answer, the model says so. It never touches the DB
// itself, so it cannot invent a property, agent, price or count.

export type Digest = {
  text: string;
  asOf: string;
  propertyCount: number;
};

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : String(v);

const day = (s: string | null) => (s ? s.slice(0, 10) : '—');
const hrs = (n: number) => `${Math.round(n)}h`;
const days = (n: number) => `${Math.round(n)}d`;

function tally<T>(rows: T[], pick: (r: T) => string | null | undefined): string {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = dash(pick(r));
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

export function buildDigest(board: Board): Digest {
  const { properties, inquiries, deals, inspections, log, due, stats } = board;
  const asOf = new Date().toISOString();
  const titleOf = new Map(properties.map((p) => [p.id, p.title]));

  const notSold = properties.filter((p) => p.status !== 'sold');
  const openInq = inquiries.filter((i) => i.status !== 'closed');
  const upcoming = inspections.filter((i) => i.status !== 'done' && i.status !== 'cancelled');

  const L: string[] = [];
  L.push('LIVE BOARD SNAPSHOT — real-estate agency Ops Desk, Uyo, Akwa Ibom (Nigeria).');
  L.push(`As of: ${asOf}. Currency is Nigerian naira (₦) as written on each listing.`);
  L.push('');
  L.push('COUNTS (these are authoritative — use them, do not recount from the lists):');
  L.push(`- Properties on the board: ${stats.properties}`);
  L.push(
    `- Still on the books (status is NOT "sold"): ${notSold.length} — ` +
      `for_sale, under_offer and let all count as not sold.`,
  );
  L.push(`- Property status breakdown: ${tally(properties, (p) => p.status)}`);
  L.push(`- Property category breakdown: ${tally(properties, (p) => p.category)}`);
  L.push(`- Properties per agent: ${tally(properties, (p) => p.agent_name)}`);
  L.push(`- Open inquiries (not closed): ${openInq.length}; flagged unanswered past 4h: ${stats.unanswered_flagged}`);
  L.push(`- Deals in progress: ${deals.length}; overdue past their stage SLA: ${stats.overdue_deals}`);
  L.push(`- Inspections today: ${stats.inspections_today}; tomorrow: ${stats.inspections_tomorrow}; upcoming (pending/confirmed/reminded): ${upcoming.length}`);
  L.push('');

  L.push('PROPERTIES (id | title | address | category | status | price | agent):');
  for (const p of properties) {
    L.push(
      `- ${p.id} | ${dash(p.title)} | ${dash(p.address)} | ${dash(p.category)} | ${dash(p.status)} | ${dash(p.price_label)} | ${dash(p.agent_name)}`,
    );
  }
  L.push('');

  L.push('DEALS (client | property | stage | stalled | SLA | overdue | agent):');
  for (const d of deals) {
    L.push(
      `- ${dash(d.client_name)} | ${dash(titleOf.get(d.property_id ?? '') ?? d.property_id)} | ${dash(d.search_stage)} | ` +
        `${days(d.stalled_days)} stalled | SLA ${dash(d.sla_days)}d | ${d.overdue ? `OVERDUE +${days(d.overdue_by_days)}` : 'on time'} | ${dash(d.agent_name)}`,
    );
  }
  L.push('');

  L.push('OPEN INQUIRIES (name | property | status | age | flag | contact):');
  for (const i of openInq) {
    L.push(
      `- ${dash(i.name)} | ${dash(titleOf.get(i.property_id ?? '') ?? (i.property_id ? i.property_id : 'general'))} | ` +
        `${dash(i.status)} | ${hrs(i.hours_old)} old | ${i.attention ? 'UNANSWERED >4h' : i.has_first_reply ? 'replied' : 'no reply yet'} | ` +
        `${dash(i.email ?? i.phone)}`,
    );
  }
  L.push('');

  L.push('UPCOMING INSPECTIONS (client | property | when | status | agent):');
  for (const ins of upcoming) {
    L.push(
      `- ${dash(ins.client_name)} | ${dash(titleOf.get(ins.property_id ?? '') ?? ins.property_id)} | ${day(ins.scheduled_for)} | ${dash(ins.status)} | ${dash(ins.agent_name)}`,
    );
  }
  L.push('');

  L.push('DUE NOW (computed live):');
  L.push(`- Client follow-ups owed (no touch in 24h+): ${due.followups.length}${due.followups.length ? ' — ' + due.followups.map((f) => `${f.name} (${hrs(f.last_touch_hours)})`).join(', ') : ''}`);
  L.push(`- Inspection reminders owed: ${due.reminders.length}${due.reminders.length ? ' — ' + due.reminders.map((r) => `${dash(r.client)} in ${hrs(r.hours_until)}`).join(', ') : ''}`);
  L.push(`- Overdue-deal alerts owed: ${due.overdue_alerts.length}${due.overdue_alerts.length ? ' — ' + due.overdue_alerts.map((o) => `${dash(o.client)} (${days(o.stalled_days)} stalled)`).join(', ') : ''}`);
  L.push('');

  L.push('RECENT EMAIL LOG (newest first — kind | recipient | subject | dispatched):');
  for (const l of log.slice(0, 8)) {
    L.push(`- ${dash(l.kind)} | ${dash(l.recipient)} | ${dash(l.subject)} | ${l.dispatched ? 'sent' : 'queued'}`);
  }

  return { text: L.join('\n'), asOf, propertyCount: properties.length };
}

const SYSTEM_PROMPT = [
  'You are "Ask the Desk", the private assistant inside a real-estate agency\'s Ops Desk (Uyo, Akwa Ibom).',
  'You answer ONLY the agency owner\'s questions about their own live board.',
  '',
  'Hard rules:',
  '- The LIVE BOARD SNAPSHOT in the user message is the single source of truth and is current. Use only it.',
  '- Never invent numbers, names, prices, agents, dates or properties. If the snapshot does not contain the answer, say plainly that it is not on the board and point to the right screen (Properties, Inquiries, Land search, Inspections, Follow-ups, or Email log).',
  '- COUNTS in the snapshot are pre-computed and authoritative. Use them; do not recount the lists; never contradict them.',
  '- "Not sold yet" / "not sold off" means any status that is not "sold": for_sale, under_offer and let all still count.',
  '- "Under offer" is NOT sold.',
  '- Currency is Nigerian naira (₦), exactly as written on each listing.',
  '- Be warm, direct and brief: 1-3 sentences. Lead with the answer, then the specific detail (property, agent, client). If asked for a list, name the items concisely.',
  '- No emoji. No preamble ("Based on the snapshot..."). Answer as a colleague who already knows the board.',
  '',
  'Email drafting (when the owner asks you to send or email someone on the board):',
  '- Draft the email: recipient from the board contact (email if present, otherwise their contact), a short subject, and a plain-text body of 2-4 warm professional sentences.',
  '- After your spoken reply, on a new line, output exactly EMAIL_DRAFT_START, then the three lines:',
  '    to: <recipient>',
  '    subject: <subject>',
  '    body: <the message>',
  '- You never send anything yourself — the owner confirms in the app.',
  '- Only include a draft when the owner actually asked you to send/email. Never invent a recipient beyond the board contact.',
].join('\n');

export type AskResult = { answer: string; model: string | null; email: EmailDraft | null };

export type EmailDraft = { to: string; subject: string; body: string };

const DRAFT_MARK = 'EMAIL_DRAFT_START';

export function parseDraft(text: string): { answer: string; email: EmailDraft | null } {
  const lines = text.split('\n');
  const markIdx = lines.findIndex((l) => l.trim().toUpperCase().includes(DRAFT_MARK));
  if (markIdx === -1) return { answer: text.trim(), email: null };
  const answer = lines.slice(0, markIdx).join('\n').trim();
  let to = '';
  let subject = '';
  const body: string[] = [];
  let phase: 'to' | 'subject' | 'body' | 'skip' = 'to';
  for (const raw of lines.slice(markIdx + 1)) {
    const t = raw.trim();
    if (phase === 'to') {
      const m = t.match(/^to\s*:\s*(.+)$/i);
      if (m) {
        to = m[1].trim();
        phase = 'subject';
      } else if (!t) continue;
      else {
        phase = 'skip';
        break;
      }
    } else if (phase === 'subject') {
      if (!t) continue;
      const s = t.match(/^subject\s*:\s*(.+)$/i);
      if (s) {
        subject = s[1].trim();
        phase = 'body';
      } else {
        phase = 'skip';
        break;
      }
    } else if (phase === 'body') {
      body.push(raw.replace(/^\s*body\s*:\s*/i, ''));
    }
  }
  const draft = to && subject && body.length ? { to, subject, body: body.join('\n').trim() } : null;
  return { answer: draft ? answer : text.trim(), email: draft };
}

export async function answerQuestion(question: string, digest: Digest): Promise<AskResult> {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_CHAT_MODEL;

  if (!key || !model) {
    const a = offlineAnswer(digest);
    return { answer: a, model: null, email: null };
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${digest.text}\n\nOwner's question: ${question}` },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const a = offlineAnswer(digest);
      return { answer: a, model: null, email: null };
    }
    const j = await res.json();
    const text = j?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      const a = offlineAnswer(digest);
      return { answer: a, model: null, email: null };
    }
    const { answer, email } = parseDraft(text);
    return { answer, model, email };
  } catch {
    const a = offlineAnswer(digest);
    return { answer: a, model: null, email: null };
  }
}

function offlineAnswer(digest: Digest): string {
  return (
    `The desk assistant model isn't reachable right now, so here is the raw board: ` +
    `${digest.propertyCount} properties on the books. ` +
    `Open Properties, Inquiries or Follow-ups in the desk for the detail.`
  );
}
