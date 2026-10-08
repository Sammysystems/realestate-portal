import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, errMsg, INSFORGE_OK } from './_lib/db.js';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (process.env.SEED_ENABLED !== 'true') return json(res, 403, { error: 'SEED_ENABLED not true' });
  if (!requireAdmin(req, res)) return;

  const clear = async (tables: string[]) => {
    for (const t of tables) {
      const r = await db.database.from(t).delete().neq('created_at', '1970-01-01T00:00:00.000Z');
      if (!INSFORGE_OK(r)) throw new Error(`seed clear failed on ${t}: ${errMsg(r.error)}`);
    }
  };
  await clear(['rep_emaillog', 'rep_inspection', 'rep_deal', 'rep_inquiry', 'rep_property']);

  const props = [
    { id: 'p1', title: 'The Aka Horizon Commercial Centre', address: 'Aka Road, Uyo', price_label: '₦420,000,000', category: 'Commercial', status: 'for_sale', agent_name: 'Mfon Udo' },
    { id: 'p2', title: 'The Haven Contemporary Villa', address: 'Shelter Afrique Estate, Uyo', price_label: '₦185,000,000', category: 'Residential', status: 'for_sale', agent_name: 'Aisha Bello' },
    { id: 'p3', title: 'Ewet Executive Residence & Terrace', address: 'Ewet Housing Estate, Uyo', price_label: '₦145,000,000', category: 'Residential', status: 'under_offer', agent_name: 'Mfon Udo' },
    { id: 'p4', title: 'Osongama Prime Development Parcel', address: 'Osongama Estate, Uyo', price_label: '₦48,000,000', category: 'Land', status: 'for_sale', agent_name: 'Aisha Bello' },
    { id: 'p5', title: 'Abak Road Mixed-Use Commercial Plaza', address: 'Abak Road, Uyo', price_label: '₦12,000,000 / year', category: 'Commercial', status: 'let', agent_name: 'Ime Akpan' },
    { id: 'p6', title: 'City Centre Corporate Office Suites', address: 'Wellington Bassey Way, Uyo', price_label: '₦290,000,000', category: 'Commercial', status: 'for_sale', agent_name: 'Ime Akpan' },
  ];
  for (const p of props) {
    const r = await db.database.from('rep_property').insert([{ ...p, created_at: daysAgo(21) }]);
    if (!INSFORGE_OK(r)) console.error('seed prop', p.id, r);
  }

  const inquiries = [
    { property_id: 'p2', name: 'Ada Essien', phone: '08037001122', email: 'ada.essien@example.com', message: 'Is the Haven Villa in Shelter Afrique still available? I would like to book an inspection.', channel: 'web', created_at: hoursAgo(6) },
    { property_id: 'p4', name: 'Daniel Etuk', phone: '08052993344', email: 'd.etuk@example.com', message: 'What is the title status on the Osongama land? Looking to buy within the year.', channel: 'web', created_at: daysAgo(2) },
    { property_id: 'p5', name: 'Ngozi Okafor', phone: '08120995566', email: 'ngozi.okafor@example.com', message: 'Interested in renting the Abak Road plaza shop for retail.', channel: 'web', created_at: daysAgo(1) },
    { property_id: 'p1', name: 'Sam Edet', phone: '09012347788', email: 'sam.edet@example.com', message: 'We are looking for office space. Is the Aka Horizon ready for corporate fit-out?', channel: 'web', created_at: daysAgo(5) },
    { property_id: null, name: 'Bassey Umoh', phone: '08061234567', email: 'bassey.umoh@example.com', message: 'Please send me your current list of land for sale.', channel: 'web', created_at: daysAgo(3) },
  ];
  const inquiryIds: Record<string, number> = {};
  for (const q of inquiries) {
    const r = await db.database.from('rep_inquiry').insert([q]);
    if (INSFORGE_OK(r)) {
      const rows = (r.data ?? []) as unknown as Array<{ id: number }>;
      inquiryIds[`${q.property_id ?? 'none'}|${q.name}`] = rows[0]?.id;
    }
  }

  const deals = [
    { id: 'd1', property_id: 'p4', client_name: 'Daniel Etuk', search_stage: 'search', docs: ['registered_survey.pdf'], agent_name: 'Aisha Bello', last_updated_at: daysAgo(17) },
    { id: 'd2', property_id: 'p2', client_name: 'Ada Essien', search_stage: 'docs', docs: ['coo_copy.pdf', 'survey.pdf'], agent_name: 'Aisha Bello', last_updated_at: daysAgo(2) },
    { id: 'd3', property_id: 'p6', client_name: 'Sam Edet', search_stage: 'consent', docs: ['governors_consent_pending.png'], agent_name: 'Ime Akpan', last_updated_at: daysAgo(9) },
    { id: 'd4', property_id: 'p1', client_name: 'Bassey Umoh', search_stage: 'new', docs: [], agent_name: 'Mfon Udo', last_updated_at: daysAgo(4) },
  ];
  for (const d of deals) {
    const r = await db.database.from('rep_deal').insert([{ ...d, created_at: d.last_updated_at }]);
    if (!INSFORGE_OK(r)) console.error('seed deal', d.id, r);
  }

  const inspections = [
    { property_id: 'p2', client_name: 'Ada Essien', scheduled_for: inHours(26), status: 'pending', agent_name: 'Aisha Bello' },
    { property_id: 'p4', client_name: 'Daniel Etuk', scheduled_for: inHours(28), status: 'pending', agent_name: 'Aisha Bello' },
    { property_id: 'p1', client_name: 'Sam Edet', scheduled_for: inHours(2), status: 'confirmed', agent_name: 'Mfon Udo' },
    { property_id: 'p6', client_name: 'Bassey Umoh', scheduled_for: inHours(120), status: 'pending', agent_name: 'Ime Akpan' },
  ];
  for (const ins of inspections) {
    const r = await db.database.from('rep_inspection').insert([ins]);
    if (!INSFORGE_OK(r)) console.error('seed inspection', r);
  }

  // Historical email trail (so "follow-ups due" and "already alerted" are live-computed).
  const logs = [
    { kind: 'first_reply', recipient: 'ngozi.okafor@example.com', subject: 'About Abak Road Mixed-Use Commercial Plaza', body: 'Thanks Ngozi — straight from our board: Abak Road Mixed-Use Commercial Plaza — let out (₦12,000,000 / year)...', dispatched: true, note: 'inquiry:' + (inquiryIds['p5|Ngozi Okafor'] ?? 0), created_at: hoursAgo(1) },
    { kind: 'first_reply', recipient: 'sam.edet@example.com', subject: 'About The Aka Horizon Commercial Centre', body: 'Thanks Sam — straight from our board: The Aka Horizon Commercial Centre — on the market (₦420,000,000)...', dispatched: true, note: 'inquiry:' + (inquiryIds['p1|Sam Edet'] ?? 0), created_at: daysAgo(2) },
    { kind: 'follow_up', recipient: 'sam.edet@example.com', subject: 'Following up — Sam Edet inquiry', body: 'Hi Sam, everything still on track for the corporate fit-out question?', dispatched: true, note: 'inquiry:' + (inquiryIds['p1|Sam Edet'] ?? 0), created_at: daysAgo(4) },
    { kind: 'overdue_alert', recipient: 'aisha@agency.example', subject: 'Land search stalled 13 days — Daniel Etuk', body: 'Land-search status: search (SLA 5 days). Last update 13 days ago...', dispatched: true, note: 'deal:d1', created_at: daysAgo(4) },
  ];
  for (const l of logs) {
    const r = await db.database.from('rep_emaillog').insert([l]);
    if (!INSFORGE_OK(r)) console.error('seed log', r);
  }

  const countRows = async (table: string) => {
    const r = await db.database.from(table).select('id');
    return (r.data as unknown as unknown[])?.length ?? 0;
  };
  const seeded = {
    properties: await countRows('rep_property'),
    inquiries: await countRows('rep_inquiry'),
    deals: await countRows('rep_deal'),
    inspections: await countRows('rep_inspection'),
    emaillog: await countRows('rep_emaillog'),
  };
  if (seeded.properties !== props.length || seeded.inquiries !== inquiries.length) {
    console.error('seed verify failed', seeded);
    return json(res, 500, { ok: false, error: 'seed verification failed', seeded });
  }
  json(res, 200, { ok: true, seeded });
}