import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, INSFORGE_OK } from './_lib/db.js';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';
import { sendEmail } from './_lib/mail.js';
import {
  dueFollowUps, dueReminders, dueOverdueAlerts,
  type Deal, type EmailLog, type Inquiry, type Inspection,
} from './_lib/compute.js';

type SendRow = { to: string | null; subject: string; body: string; kind: string; note?: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!requireAdmin(req, res)) return;

  const type = String(req.body?.type ?? '');
  if (!['follow-ups', 'overdue-alerts', 'reminders'].includes(type)) {
    return json(res, 400, { error: 'type must be follow-ups | overdue-alerts | reminders' });
  }

  const now = new Date().toISOString();
  const [dealsR, inqR, insR, logR] = await Promise.all([
    db.database.from('rep_deal').select('*'),
    db.database.from('rep_inquiry').select('*').limit(500),
    db.database.from('rep_inspection').select('*'),
    db.database.from('rep_emaillog').select('*').limit(100),
  ]);
  const deals = (dealsR.data ?? []) as Deal[];
  const inquiries = (inqR.data ?? []) as Inquiry[];
  const inspections = (insR.data ?? []) as Inspection[];
  const log = (logR.data ?? []) as EmailLog[];

  const rows: SendRow[] = [];
  const extra: Array<{ table: 'rep_inspection'; id: number; patch: Record<string, unknown> }> = [];

  if (type === 'follow-ups') {
    for (const { inquiry, last_touch_hours } of dueFollowUps(inquiries, log, now)) {
      rows.push({
        to: inquiry.email || null,
        subject: `Following up — ${inquiry.name}'s inquiry`,
        body:
          `Hi ${inquiry.name},\n\nJust checking in on your enquiry from ` +
          `${new Date(inquiry.created_at).toDateString()} (${last_touch_hours}h without a touch from us). ` +
          `Still interested? Reply here or book an inspection — we'll hold options open while you decide.\n\n` +
          `Agency Ops Desk`,
        kind: 'follow_up',
        note: `inquiry:${inquiry.id}`,
      });
    }
  }

  if (type === 'overdue-alerts') {
    for (const { deal } of dueOverdueAlerts(deals, log, now)) {
      rows.push({
        to: null,
        subject: `Land search stalled ${Math.round(deal.stalled_days)} days — ${deal.client_name ?? deal.id}`,
        body:
          `Land-search status: ${deal.search_stage} (SLA ${deal.sla_days} days). ` +
          `Last update ${Math.round(deal.stalled_days)} days ago — ${Math.round(deal.overdue_by_days)} days past the deadline.\n\n` +
          `Reach the agent or confirm a next step today so this deal does not go cold.`,
        kind: 'overdue_alert',
        note: `deal:${deal.id}`,
      });
    }
  }

  if (type === 'reminders') {
    for (const { inspection } of dueReminders(inspections, now)) {
      rows.push({
        to: null,
        subject: `Inspection reminder — ${inspection.client_name ?? 'client'}`,
        body:
          `Reminder for the inspection ${inspection.client_name ?? ''} at ` +
          `${new Date(inspection.scheduled_for).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}` +
          ` (${inspection.agent_name ? `agent: ${inspection.agent_name}` : ''}). Confirm or reschedule.`,
        kind: 'reminder',
        note: `inspection:${inspection.id}`,
      });
      extra.push({ table: 'rep_inspection', id: inspection.id, patch: { status: 'reminded' } });
    }
  }

  const sent: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const { result, logBody } = await sendEmail(row);
    await db.database.from('rep_emaillog').insert([{
      kind: row.kind,
      recipient: result.to,
      subject: row.subject,
      body: logBody,
      dispatched: result.ok,
      note: result.error ? `error:${result.error}` : (row.note ?? null),
    }]);
    sent.push({ kind: row.kind, to: result.to, ok: result.ok, error: result.error, note: row.note ?? null });
  }

  for (const e of extra) {
    if (INSFORGE_OK(await db.database.from(e.table).update(e.patch).eq('id', e.id))) {
      console.log('actions state updated', e.table, e.id);
    }
  }

  json(res, 200, { action: type, dispatched: sent.length, sent });
}