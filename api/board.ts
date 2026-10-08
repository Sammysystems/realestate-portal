import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, INSFORGE_OK } from './_lib/db.js';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';
import {
  computeDeals, computeInquiries, dueFollowUps, dueReminders, dueOverdueAlerts,
  type Deal, type EmailLog, type Inquiry, type Inspection, type Property,
} from './_lib/compute.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });
  if (!requireAdmin(req, res)) return;

  const [props, inqs, dealsResp, inss, logs] = await Promise.all([
    db.database.from('rep_property').select('*').order('created_at', { ascending: false }),
    db.database.from('rep_inquiry').select('*').order('created_at', { ascending: false }).limit(200),
    db.database.from('rep_deal').select('*'),
    db.database.from('rep_inspection').select('*').order('scheduled_for', { ascending: true }),
    db.database.from('rep_emaillog').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  const fail = (label: string, r: unknown) => {
    console.error('board', label, r);
  };
  if (!INSFORGE_OK(props)) fail('rep_property', props);
  if (!INSFORGE_OK(inqs)) fail('rep_inquiry', inqs);
  if (!INSFORGE_OK(dealsResp)) fail('rep_deal', dealsResp);
  if (!INSFORGE_OK(inss)) fail('rep_inspection', inss);
  if (!INSFORGE_OK(logs)) fail('rep_emaillog', logs);

  const properties = (props.data ?? []) as Property[];
  const inquiries = (inqs.data ?? []) as Inquiry[];
  const deals = (dealsResp.data ?? []) as Deal[];
  const inspections = (inss.data ?? []) as Inspection[];
  const log = (logs.data ?? []) as EmailLog[];

  const now = new Date().toISOString();
  const computedInquiries = computeInquiries(inquiries, now);
  const computedDeals = computeDeals(deals, now);

  const due = {
    followups: dueFollowUps(inquiries, log, now).map((d) => ({
      inquiry_id: d.inquiry.id,
      name: d.inquiry.name,
      last_touch_hours: d.last_touch_hours,
    })),
    reminders: dueReminders(inspections, now).map((d) => ({
      inspection_id: d.inspection.id,
      client: d.inspection.client_name,
      hours_until: d.hours_until,
    })),
    overdue_alerts: dueOverdueAlerts(deals, log, now).map((d) => ({
      deal_id: d.deal.id,
      client: d.deal.client_name,
      stalled_days: Math.round(d.deal.stalled_days),
      overdue_by_days: Math.round(d.deal.overdue_by_days),
    })),
  };

  const stats = {
    properties: properties.length,
    open_inquiries: computedInquiries.filter((i) => i.status !== 'closed').length,
    unanswered_flagged: computedInquiries.filter((i) => i.attention).length,
    overdue_deals: computedDeals.filter((d) => d.overdue).length,
    inspections_today: inspections.filter((i) => {
      const d = new Date(i.scheduled_for);
      const t = new Date();
      return d.toDateString() === t.toDateString();
    }).length,
    inspections_tomorrow: inspections.filter((i) => {
      const d = new Date(i.scheduled_for);
      const t = new Date();
      t.setDate(t.getDate() + 1);
      return d.toDateString() === t.toDateString();
    }).length,
  };

  json(res, 200, { properties, inquiries: computedInquiries, deals: computedDeals, inspections, log, due, stats });
}