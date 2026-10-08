// Live "fire now" computations. The board renders these at load; the actions
// endpoint dispatches the same lists on click. Nothing here is scheduled.

export type Property = {
  id: string;
  title: string;
  address: string | null;
  price_label: string | null;
  category: string;
  status: string;
  agent_name: string | null;
  created_at: string;
};

export type Inquiry = {
  id: number;
  property_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  channel: string;
  status: string;
  first_reply_sent_at: string | null;
  created_at: string;
};

export type Deal = {
  id: string;
  property_id: string | null;
  inquiry_id: number | null;
  client_name: string | null;
  search_stage: string;
  docs: unknown[];
  agent_name: string | null;
  last_updated_at: string;
  created_at: string;
};

export type Inspection = {
  id: number;
  property_id: string | null;
  inquiry_id: number | null;
  client_name: string | null;
  scheduled_for: string;
  status: string;
  agent_name: string | null;
  created_at: string;
};

export type EmailLog = {
  id: number;
  kind: string;
  recipient: string | null;
  subject: string;
  body: string;
  dispatched: boolean;
  note: string | null;
  created_at: string;
};

export const STAGE_SLA_DAYS: Record<string, number> = {
  new: 3,
  search: 5,
  docs: 7,
  consent: 10,
  exchange: 14,
};

const hoursBetween = (a: string, b: string) =>
  (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
const daysBetween = (a: string, b: string) => hoursBetween(a, b) / 24;

export type ComputedDeal = Deal & {
  stalled_days: number;
  overdue: boolean;
  overdue_by_days: number;
  sla_days: number;
};

export function computeDeals(deals: Deal[], now = new Date().toISOString()): ComputedDeal[] {
  return deals.map((d) => {
    const sla = STAGE_SLA_DAYS[d.search_stage] ?? 5;
    const stalled = Math.max(0, daysBetween(d.last_updated_at, now));
    return {
      ...d,
      stalled_days: stalled,
      sla_days: sla,
      overdue: stalled > sla,
      overdue_by_days: Math.max(0, stalled - sla),
    };
  });
}

export type ComputedInquiry = Inquiry & {
  hours_old: number;
  untouched_hours: number;
  has_first_reply: boolean;
  attention: boolean;
};

export function computeInquiries(inquiries: Inquiry[], now = new Date().toISOString()): ComputedInquiry[] {
  return inquiries.map((inquiry) => {
    const hoursOld = Math.max(0, hoursBetween(inquiry.created_at, now));
    const last = inquiry.first_reply_sent_at ?? inquiry.created_at;
    return {
      ...inquiry,
      hours_old: hoursOld,
      untouched_hours: Math.max(0, hoursBetween(last, now)),
      has_first_reply: Boolean(inquiry.first_reply_sent_at),
      attention: inquiry.status !== 'closed' && !inquiry.first_reply_sent_at && hoursOld > 4,
    };
  });
}

/** An inquiry "owes" a follow-up when it is open and nothing has been sent in 24h+. */
export function dueFollowUps(
  inquiries: Inquiry[],
  log: EmailLog[],
  now = new Date().toISOString(),
): Array<{ inquiry: Inquiry; last_touch_hours: number }> {
  const open = inquiries.filter((i) => i.status !== 'closed');
  const out: Array<{ inquiry: Inquiry; last_touch_hours: number }> = [];
  for (const i of open) {
    // Newest dispatched entry for this recipient — order-independent (the board
    // window is newest-first, so index-based "last" would pick the oldest).
    let touch = i.created_at;
    for (const l of log) {
      if (l.dispatched && l.recipient === i.email && l.created_at > touch) touch = l.created_at;
    }
    const since = hoursBetween(touch, now);
    if (since >= 24) out.push({ inquiry: i, last_touch_hours: Math.floor(since) });
  }
  return out.sort((a, b) => b.last_touch_hours - a.last_touch_hours);
}

/** Inspections whose reminder is owed now: unconfirmed inside 24h, or confirmed inside 6h. */
export function dueReminders(
  inspections: Inspection[],
  now = new Date().toISOString(),
): Array<{ inspection: Inspection; hours_until: number }> {
  const out: Array<{ inspection: Inspection; hours_until: number }> = [];
  for (const ins of inspections) {
    if (ins.status === 'done' || ins.status === 'cancelled') continue;
    const until = hoursBetween(now, ins.scheduled_for);
    const owes =
      ins.status === 'reminded' ? false
      : ins.status === 'confirmed' ? until <= 6
      : until <= 24;
    if (owes) out.push({ inspection: ins, hours_until: Math.round(until) });
  }
  return out.sort((a, b) => a.hours_until - b.hours_until);
}

/** Deals whose overdue-alert email is owed (last alert older than 24h). */
export function dueOverdueAlerts(
  deals: Deal[],
  log: EmailLog[],
  now = new Date().toISOString(),
): Array<{ deal: ComputedDeal }> {
  const computed = computeDeals(deals, now).filter((d) => d.overdue);
  return computed
    .filter((d) => {
      const note = `deal:${d.id}`;
      let lastAlert: string | undefined;
      for (const l of log) {
        if (l.kind === 'overdue_alert' && l.note === note && (!lastAlert || l.created_at > lastAlert)) {
          lastAlert = l.created_at;
        }
      }
      return !lastAlert || hoursBetween(lastAlert, now) >= 24;
    })
    .map((deal) => ({ deal }));
}