import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, errMsg, INSFORGE_OK } from './_lib/db.js';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const plusHours = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();

type SeedInquiry = {
  property_id: string | null;
  name: string;
  phone: string;
  email: string;
  message: string;
  channel: string;
  status: string;
  first_reply_sent_at: string | null;
  created_at: string;
};

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
  const insertAll = async (table: string, rows: unknown[]) => {
    const r = await db.database.from(table).insert(rows);
    if (!INSFORGE_OK(r)) throw new Error(`seed insert failed on ${table}: ${errMsg(r.error)}`);
  };

  await clear(['rep_emaillog', 'rep_inspection', 'rep_deal', 'rep_inquiry', 'rep_property']);

  // 26 properties — status/category/agent mix, days on market spread over ~10 weeks.
  const props = [
    { id: 'p1', title: 'The Aka Horizon Commercial Centre', address: 'Aka Road, Uyo', price_label: '₦420,000,000', category: 'Commercial', status: 'for_sale', agent_name: 'Mfon Udo', created_at: daysAgo(21) },
    { id: 'p2', title: 'The Haven Contemporary Villa', address: 'Shelter Afrique Estate, Uyo', price_label: '₦185,000,000', category: 'Residential', status: 'for_sale', agent_name: 'Aisha Bello', created_at: daysAgo(34) },
    { id: 'p3', title: 'Ewet Executive Residence & Terrace', address: 'Ewet Housing Estate, Uyo', price_label: '₦145,000,000', category: 'Residential', status: 'under_offer', agent_name: 'Mfon Udo', created_at: daysAgo(18) },
    { id: 'p4', title: 'Osongama Prime Development Parcel', address: 'Osongama Estate, Uyo', price_label: '₦48,000,000', category: 'Land', status: 'for_sale', agent_name: 'Aisha Bello', created_at: daysAgo(56) },
    { id: 'p5', title: 'Abak Road Mixed-Use Commercial Plaza', address: 'Abak Road, Uyo', price_label: '₦12,000,000 / year', category: 'Commercial', status: 'let', agent_name: 'Ime Akpan', created_at: daysAgo(41) },
    { id: 'p6', title: 'City Centre Corporate Office Suites', address: 'Wellington Bassey Way, Uyo', price_label: '₦290,000,000', category: 'Commercial', status: 'for_sale', agent_name: 'Ime Akpan', created_at: daysAgo(27) },
    { id: 'p7', title: 'Ikot Ekpene Road Twin Duplex', address: 'Ikot Ekpene Road, Uyo', price_label: '₦210,000,000', category: 'Residential', status: 'for_sale', agent_name: 'Uduak Okon', created_at: daysAgo(12) },
    { id: 'p8', title: 'Oron Road Garden Flat', address: 'Oron Road, Uyo', price_label: '₦45,000,000', category: 'Residential', status: 'for_sale', agent_name: 'Ekemini Bassi', created_at: daysAgo(9) },
    { id: 'p9', title: 'Mallam Jaja Warehouse Complex', address: 'Mallam Jaja, Uyo', price_label: '₦95,000,000', category: 'Commercial', status: 'under_offer', agent_name: 'Ime Akpan', created_at: daysAgo(38) },
    { id: 'p10', title: 'Ekpene Ukim Residential Plots', address: 'Ekpene Ukim, Uyo', price_label: '₦18,000,000 / plot', category: 'Land', status: 'for_sale', agent_name: 'Aisha Bello', created_at: daysAgo(47) },
    { id: 'p11', title: 'Wellington Bassey Serviced Apartment', address: 'Wellington Bassey Way, Uyo', price_label: '₦28,000,000 / year', category: 'Residential', status: 'let', agent_name: 'Uduak Okon', created_at: daysAgo(15) },
    { id: 'p12', title: 'Shelter Afrique Corner Duplex', address: 'Shelter Afrique Estate, Uyo', price_label: '₦165,000,000', category: 'Residential', status: 'sold', agent_name: 'Mfon Udo', created_at: daysAgo(63) },
    { id: 'p13', title: 'Nung Udoe Farm Settlement Land', address: 'Nung Udoe, Uyo', price_label: '₦75,000,000', category: 'Land', status: 'for_sale', agent_name: 'Ekemini Bassi', created_at: daysAgo(52) },
    { id: 'p14', title: 'Idoro Hill View Terrace', address: 'Idoro, Uyo', price_label: '₦88,000,000', category: 'Residential', status: 'under_offer', agent_name: 'Uduak Okon', created_at: daysAgo(24) },
    { id: 'p15', title: 'Ewet Housing Estate Bungalow', address: 'Ewet Housing Estate, Uyo', price_label: '₦72,000,000', category: 'Residential', status: 'for_sale', agent_name: 'Aisha Bello', created_at: daysAgo(7) },
    { id: 'p16', title: 'Airport Road Logistics Hub', address: 'Nnamdi Azikiwe Expressway, Uyo', price_label: '₦340,000,000', category: 'Commercial', status: 'for_sale', agent_name: 'Ime Akpan', created_at: daysAgo(31) },
    { id: 'p17', title: 'Uyo Estate 4-Bed Detached', address: 'Shelter Afrique Estate, Uyo', price_label: '₦195,000,000', category: 'Residential', status: 'for_sale', agent_name: 'Mfon Udo', created_at: daysAgo(5) },
    { id: 'p18', title: 'Afaha Ukuo Commercial Plot', address: 'Afaha Ukuo, Uyo', price_label: '₦65,000,000', category: 'Land', status: 'for_sale', agent_name: 'Ekemini Bassi', created_at: daysAgo(44) },
    { id: 'p19', title: 'Southern Quarters Renovated Duplex', address: 'Southern Quarters, Uyo', price_label: '₦120,000,000', category: 'Residential', status: 'sold', agent_name: 'Uduak Okon', created_at: daysAgo(70) },
    { id: 'p20', title: 'Ekpri Nsukara Shop Row', address: 'Ekpri Nsukara, Uyo', price_label: '₦6,500,000 / year', category: 'Commercial', status: 'let', agent_name: 'Ime Akpan', created_at: daysAgo(19) },
    { id: 'p21', title: 'Ibom Boulevard Executive Flat', address: 'Ibom Boulevard, Uyo', price_label: '₦35,000,000 / year', category: 'Residential', status: 'let', agent_name: 'Ekemini Bassi', created_at: daysAgo(11) },
    { id: 'p22', title: 'Odua Street Mini Estate', address: 'Odua Street, Uyo', price_label: '₦150,000,000', category: 'Residential', status: 'under_offer', agent_name: 'Aisha Bello', created_at: daysAgo(36) },
    { id: 'p23', title: 'Uruan Block of Six Flats', address: 'Uruan, Uyo', price_label: '₦135,000,000', category: 'Residential', status: 'for_sale', agent_name: 'Mfon Udo', created_at: daysAgo(29) },
    { id: 'p24', title: 'Mani Oforama Road Manse', address: 'Mani Oforama, Uyo', price_label: '₦98,000,000', category: 'Residential', status: 'sold', agent_name: 'Uduak Okon', created_at: daysAgo(58) },
    { id: 'p25', title: 'Eight Mile Roundabout Showroom', address: 'Eight Mile Roundabout, Uyo', price_label: '₦260,000,000', category: 'Commercial', status: 'for_sale', agent_name: 'Ime Akpan', created_at: daysAgo(16) },
    { id: 'p26', title: 'Etinan Road Residential Land', address: 'Etinan Road, Uyo', price_label: '₦32,000,000', category: 'Land', status: 'sold', agent_name: 'Ekemini Bassi', created_at: daysAgo(66) },
  ];
  // Category-matched photos shipped in public/properties/.
  const IMAGE_BY_ID: Record<string, string> = {
    p1: 'prop-45', p2: 'prop-21', p3: 'prop-43', p4: 'prop-48', p5: 'prop-47', p6: 'prop-46',
    p7: 'prop-02', p8: 'prop-42', p9: 'prop-60', p10: 'prop-55', p11: 'prop-41', p12: 'prop-53',
    p13: 'prop-50', p14: 'prop-54', p15: 'prop-44', p16: 'prop-61', p17: 'prop-01', p18: 'prop-57',
    p19: 'prop-51', p20: 'prop-59', p21: 'prop-52', p22: 'prop-03', p23: 'prop-04', p24: 'prop-22',
    p25: 'prop-58', p26: 'prop-56',
  };
  await insertAll(
    'rep_property',
    props.map((p) => ({ ...p, image_url: `/properties/${IMAGE_BY_ID[p.id]}` })),
  );

  // 34 inquiries over 14 days: 9 unanswered (6 past the 4h SLA), 18 replied, 7 closed.
  const inquiries: SeedInquiry[] = [
    // Unanswered — past the 4h first-reply SLA (dashboard red flags + follow-up list).
    { property_id: 'p17', name: 'Victor Henshaw', phone: '08034115566', email: 'victor.henshaw@example.com', message: 'Is the Uyo Estate 4-bed still available? I would like to inspect this week.', channel: 'web', status: 'new', first_reply_sent_at: null, created_at: hoursAgo(5) },
    { property_id: 'p13', name: 'Mercy Akpan', phone: '08126554477', email: 'mercy.akpan@example.com', message: 'Please send the survey plan for the Nung Udoe land — I want to run due diligence.', channel: 'whatsapp', status: 'new', first_reply_sent_at: null, created_at: hoursAgo(9) },
    { property_id: null, name: 'Kemi Adeyemi', phone: '08097773311', email: 'kemi.adeyemi@example.com', message: 'Do you manage rentals in Shelter Afrique? Budget is ₦25m a year.', channel: 'web', status: 'new', first_reply_sent_at: null, created_at: hoursAgo(13) },
    { property_id: 'p16', name: 'Tunde Bakare', phone: '07055120099', email: 'tunde.bakare@example.com', message: 'We need 800sqm warehouse space off Airport Road. Call me.', channel: 'web', status: 'new', first_reply_sent_at: null, created_at: daysAgo(2) },
    { property_id: 'p25', name: 'Chidinma Eze', phone: '08064432218', email: 'chidinma.eze@example.com', message: 'Is the Eight Mile showroom still available? We are fitting out a furniture store.', channel: 'email', status: 'new', first_reply_sent_at: null, created_at: daysAgo(3) },
    { property_id: 'p10', name: 'Emeka Nwosu', phone: '08139005544', email: 'emeka.nwosu@example.com', message: 'Interested in two plots at Ekpene Ukim. What is the payment plan?', channel: 'whatsapp', status: 'new', first_reply_sent_at: null, created_at: daysAgo(5) },
    // Fresh arrivals — still inside the SLA (amber "New" badges).
    { property_id: 'p15', name: 'Halima Yusuf', phone: '08022334455', email: 'halima.yusuf@example.com', message: 'Has anyone viewed the Ewet bungalow? I am still interested.', channel: 'web', status: 'new', first_reply_sent_at: null, created_at: hoursAgo(1) },
    { property_id: 'p7', name: 'Femi Ojo', phone: '07011223344', email: 'femi.ojo@example.com', message: 'Twin duplex on Ikot Ekpene Rd — my agent will come by today.', channel: 'web', status: 'new', first_reply_sent_at: null, created_at: hoursAgo(2) },
    { property_id: 'p21', name: 'Peace Inyang', phone: '08155667788', email: 'peace.inyang@example.com', message: 'Need a serviced 3-bed flat on Ibom Boulevard, ready to move in March.', channel: 'web', status: 'new', first_reply_sent_at: null, created_at: hoursAgo(3) },
    // Replied — first_reply latencies from 5 minutes to over 5 hours (feeds the gauge).
    { property_id: 'p2', name: 'Ada Essien', phone: '08037001122', email: 'ada.essien@example.com', message: 'Is the Haven Villa in Shelter Afrique still available? I would like to book an inspection.', channel: 'web', status: 'replied', created_at: hoursAgo(6), first_reply_sent_at: plusHours(hoursAgo(6), 0.3) },
    { property_id: 'p4', name: 'Daniel Etuk', phone: '08052993344', email: 'd.etuk@example.com', message: 'What is the title status on the Osongama land? Looking to buy within the year.', channel: 'web', status: 'replied', created_at: daysAgo(2), first_reply_sent_at: plusHours(daysAgo(2), 1.2) },
    { property_id: 'p5', name: 'Ngozi Okafor', phone: '08120995566', email: 'ngozi.okafor@example.com', message: 'Interested in renting the Abak Road plaza shop for retail.', channel: 'web', status: 'replied', created_at: daysAgo(1), first_reply_sent_at: plusHours(daysAgo(1), 0.08) },
    { property_id: 'p1', name: 'Sam Edet', phone: '09012347788', email: 'sam.edet@example.com', message: 'We are looking for office space. Is the Aka Horizon ready for corporate fit-out?', channel: 'web', status: 'replied', created_at: daysAgo(5), first_reply_sent_at: plusHours(daysAgo(5), 2.5) },
    { property_id: 'p3', name: 'Aniekan Bob', phone: '08033112244', email: 'aniekan.bob@example.com', message: 'The Ewet terrace is under offer — do you have anything similar?', channel: 'web', status: 'replied', created_at: hoursAgo(8), first_reply_sent_at: plusHours(hoursAgo(8), 0.5) },
    { property_id: 'p8', name: 'Rita Odey', phone: '08077115522', email: 'rita.odey@example.com', message: 'Oron Road flat: is the title clean? Send the documents if yes.', channel: 'whatsapp', status: 'replied', created_at: hoursAgo(11), first_reply_sent_at: plusHours(hoursAgo(11), 1.8) },
    { property_id: 'p23', name: 'Saviour Otu', phone: '08134556677', email: 'saviour.otu@example.com', message: 'Six flats in Uruan — is it sold as a block or per unit?', channel: 'web', status: 'replied', created_at: hoursAgo(20), first_reply_sent_at: plusHours(hoursAgo(20), 0.2) },
    { property_id: 'p11', name: 'Blessing Etim', phone: '08066554433', email: 'blessing.etim@example.com', message: 'Wellington Bassey serviced apartment — annual rent, is parking covered?', channel: 'web', status: 'replied', created_at: daysAgo(2), first_reply_sent_at: plusHours(daysAgo(2), 3.5) },
    { property_id: 'p18', name: 'Uche Nnaji', phone: '07055443322', email: 'uche.nnaji@example.com', message: 'Afaha Ukuo plot — send the governor\u2019s consent status.', channel: 'web', status: 'replied', created_at: daysAgo(3), first_reply_sent_at: plusHours(daysAgo(3), 5.1) },
    { property_id: 'p9', name: 'Joseph Akan', phone: '08022114455', email: 'joseph.akan@example.com', message: 'Mallam Jaja warehouse: can it take a 40ft container?', channel: 'web', status: 'replied', created_at: daysAgo(4), first_reply_sent_at: plusHours(daysAgo(4), 0.6) },
    { property_id: 'p20', name: 'Maryam Abdullahi', phone: '08199887766', email: 'maryam.abdullahi@example.com', message: 'Ekpri Nsukara shop row — which units are still vacant?', channel: 'email', status: 'replied', created_at: daysAgo(4), first_reply_sent_at: plusHours(daysAgo(4), 0.15) },
    { property_id: 'p14', name: 'Ekene Okeke', phone: '08033445566', email: 'ekene.okeke@example.com', message: 'Idoro Hill View: I have seen the survey, what is the next step?', channel: 'whatsapp', status: 'replied', created_at: daysAgo(6), first_reply_sent_at: plusHours(daysAgo(6), 2.2) },
    { property_id: 'p6', name: 'Solomon Udo', phone: '09066778899', email: 'solomon.udo@example.com', message: 'City Centre suites — do you do staged payment?', channel: 'web', status: 'replied', created_at: daysAgo(7), first_reply_sent_at: plusHours(daysAgo(7), 0.4) },
    { property_id: 'p22', name: 'Joy Abass', phone: '08011223345', email: 'joy.abass@example.com', message: 'Odua mini estate — how many units, and what is the service charge?', channel: 'web', status: 'replied', created_at: daysAgo(8), first_reply_sent_at: plusHours(daysAgo(8), 4.6) },
    { property_id: 'p19', name: 'Ime Obong', phone: '08144556677', email: 'ime.obong@example.com', message: 'Southern Quarters duplex — already sold? Add me to your list.', channel: 'web', status: 'replied', created_at: daysAgo(9), first_reply_sent_at: plusHours(daysAgo(9), 0.25) },
    { property_id: 'p12', name: 'Grace Udofia', phone: '08055667788', email: 'grace.udofia@example.com', message: 'Shelter Afrique corner duplex: I missed it — show me similar.', channel: 'web', status: 'replied', created_at: daysAgo(11), first_reply_sent_at: plusHours(daysAgo(11), 1.1) },
    { property_id: 'p24', name: 'Michael Umanah', phone: '07088990011', email: 'michael.umanah@example.com', message: 'Mani Oforama manse — was there a price reduction?', channel: 'web', status: 'replied', created_at: daysAgo(13), first_reply_sent_at: plusHours(daysAgo(13), 0.9) },
    { property_id: 'p13', name: 'Adaobi Nwankwo', phone: '08067890123', email: 'adaobi.nwankwo@example.com', message: 'Two plots near Nung Udoe — is the fencing done?', channel: 'whatsapp', status: 'replied', created_at: daysAgo(6), first_reply_sent_at: plusHours(daysAgo(6), 0.45) },
    // Closed — resolved conversations in the history.
    { property_id: 'p5', name: 'Ifeoma Chukwu', phone: '08099001122', email: 'ifeoma.chukwu@example.com', message: 'Abak Road plaza: is the shop front rebrandable?', channel: 'web', status: 'closed', created_at: daysAgo(6), first_reply_sent_at: plusHours(daysAgo(6), 0.3) },
    { property_id: null, name: 'Segun Alabi', phone: '07055443311', email: 'segun.alabi@example.com', message: 'Send your current land list in Uyo South.', channel: 'web', status: 'closed', created_at: daysAgo(8), first_reply_sent_at: plusHours(daysAgo(8), 1.4) },
    { property_id: 'p26', name: 'Iniobong Victor', phone: '08123456790', email: 'iniobong.victor@example.com', message: 'Etinan Road land — final price?', channel: 'web', status: 'closed', created_at: daysAgo(9), first_reply_sent_at: plusHours(daysAgo(9), 0.5) },
    { property_id: 'p23', name: 'Rowland Ekpo', phone: '08033556677', email: 'rowland.ekpo@example.com', message: 'Uruan flats: I will take unit 3.', channel: 'whatsapp', status: 'closed', created_at: daysAgo(10), first_reply_sent_at: plusHours(daysAgo(10), 2) },
    { property_id: 'p17', name: 'Zainab Idris', phone: '09011223345', email: 'zainab.idris@example.com', message: 'Uyo Estate detached — deposit structure?', channel: 'web', status: 'closed', created_at: daysAgo(11), first_reply_sent_at: plusHours(daysAgo(11), 0.12) },
    { property_id: 'p4', name: 'Peter Umoh', phone: '08066554488', email: 'peter.umoh@example.com', message: 'Osongama: survey received, proceeding.', channel: 'email', status: 'closed', created_at: daysAgo(12), first_reply_sent_at: plusHours(daysAgo(12), 3) },
    { property_id: 'p16', name: 'Aisha Garba', phone: '08177889900', email: 'aisha.garba@example.com', message: 'Airport Road hub: too big for us — smaller unit?', channel: 'web', status: 'closed', created_at: daysAgo(13), first_reply_sent_at: plusHours(daysAgo(13), 0.7) },
  ];
  await insertAll('rep_inquiry', inquiries);

  // Map inquiry name|email -> id (table was cleared, so these are our rows).
  const idResp = await db.database
    .from('rep_inquiry')
    .select('id, name, email')
    .order('id', { ascending: true });
  if (!INSFORGE_OK(idResp)) throw new Error(`seed inquiry id lookup failed: ${errMsg(idResp.error)}`);
  const inquiryIds = new Map<string, number>();
  for (const row of (idResp.data ?? []) as Array<{ id: number; name: string; email: string }>) {
    inquiryIds.set(`${row.name}|${row.email}`, row.id);
  }
  const iid = (name: string, email: string) => inquiryIds.get(`${name}|${email}`) ?? 0;

  // 14 land-search deals — every stage represented, 5 deliberately past SLA.
  const deals = [
    { id: 'd1', property_id: 'p4', client_name: 'Daniel Etuk', search_stage: 'search', docs: ['survey.pdf'], agent_name: 'Aisha Bello', last_updated_at: daysAgo(13) },
    { id: 'd2', property_id: 'p6', client_name: 'Sam Edet', search_stage: 'consent', docs: ['governors_consent_pending.png'], agent_name: 'Ime Akpan', last_updated_at: daysAgo(14) },
    { id: 'd3', property_id: 'p23', client_name: 'Saviour Otu', search_stage: 'search', docs: ['receipt.pdf'], agent_name: 'Mfon Udo', last_updated_at: daysAgo(9) },
    { id: 'd4', property_id: 'p9', client_name: 'Joseph Akan', search_stage: 'docs', docs: ['deed_of_assignment.pdf', 'search_report.pdf'], agent_name: 'Ime Akpan', last_updated_at: daysAgo(11) },
    { id: 'd5', property_id: 'p12', client_name: 'Grace Udofia', search_stage: 'exchange', docs: ['receipt_of_exchange.pdf'], agent_name: 'Mfon Udo', last_updated_at: daysAgo(16) },
    { id: 'd6', property_id: 'p2', client_name: 'Ada Essien', search_stage: 'docs', docs: ['coo_copy.pdf', 'survey.pdf'], agent_name: 'Aisha Bello', last_updated_at: daysAgo(2) },
    { id: 'd7', property_id: 'p1', client_name: 'Bassey Umoh', search_stage: 'new', docs: [], agent_name: 'Mfon Udo', last_updated_at: daysAgo(1) },
    { id: 'd8', property_id: 'p7', client_name: 'Femi Ojo', search_stage: 'new', docs: [], agent_name: 'Uduak Okon', last_updated_at: daysAgo(2) },
    { id: 'd9', property_id: 'p3', client_name: 'Aniekan Bob', search_stage: 'new', docs: ['intent_letter.pdf'], agent_name: 'Mfon Udo', last_updated_at: hoursAgo(20) },
    { id: 'd10', property_id: 'p14', client_name: 'Ekene Okeke', search_stage: 'search', docs: ['survey.pdf'], agent_name: 'Uduak Okon', last_updated_at: daysAgo(3) },
    { id: 'd11', property_id: 'p18', client_name: 'Uche Nnaji', search_stage: 'search', docs: ['survey.pdf'], agent_name: 'Ekemini Bassi', last_updated_at: daysAgo(4) },
    { id: 'd12', property_id: 'p10', client_name: 'Emeka Nwosu', search_stage: 'docs', docs: ['survey.pdf', 'cadastral_plan.pdf'], agent_name: 'Aisha Bello', last_updated_at: daysAgo(5) },
    { id: 'd13', property_id: 'p22', client_name: 'Joy Abass', search_stage: 'consent', docs: ['consent_application.pdf'], agent_name: 'Aisha Bello', last_updated_at: daysAgo(6) },
    { id: 'd14', property_id: 'p25', client_name: 'Chidinma Eze', search_stage: 'exchange', docs: ['draft_allotment.pdf'], agent_name: 'Ime Akpan', last_updated_at: daysAgo(10) },
  ];
  await insertAll('rep_deal', deals.map((d) => ({ ...d, created_at: d.last_updated_at })));

  // 16 inspections — past done, today (2 due for reminders), tomorrow, and the week out.
  const inspections = [
    { property_id: 'p3', client_name: 'Aniekan Bob', scheduled_for: daysAgo(3), status: 'done', agent_name: 'Mfon Udo' },
    { property_id: 'p11', client_name: 'Blessing Etim', scheduled_for: daysAgo(5), status: 'done', agent_name: 'Uduak Okon' },
    { property_id: 'p19', client_name: 'Ime Obong', scheduled_for: daysAgo(8), status: 'done', agent_name: 'Uduak Okon' },
    { property_id: 'p7', client_name: 'Femi Ojo', scheduled_for: hoursAgo(2), status: 'done', agent_name: 'Uduak Okon' },
    { property_id: 'p15', client_name: 'Halima Yusuf', scheduled_for: inHours(3), status: 'confirmed', agent_name: 'Aisha Bello' },
    { property_id: 'p2', client_name: 'Ada Essien', scheduled_for: inHours(6), status: 'pending', agent_name: 'Aisha Bello' },
    { property_id: 'p10', client_name: 'Emeka Nwosu', scheduled_for: inHours(9), status: 'pending', agent_name: 'Aisha Bello' },
    { property_id: 'p4', client_name: 'Daniel Etuk', scheduled_for: inHours(27), status: 'pending', agent_name: 'Aisha Bello' },
    { property_id: 'p17', client_name: 'Victor Henshaw', scheduled_for: inHours(30), status: 'confirmed', agent_name: 'Mfon Udo' },
    { property_id: 'p25', client_name: 'Chidinma Eze', scheduled_for: inHours(44), status: 'pending', agent_name: 'Ime Akpan' },
    { property_id: 'p1', client_name: 'Sam Edet', scheduled_for: inHours(70), status: 'pending', agent_name: 'Mfon Udo' },
    { property_id: 'p23', client_name: 'Saviour Otu', scheduled_for: inHours(96), status: 'pending', agent_name: 'Mfon Udo' },
    { property_id: 'p13', client_name: 'Adaobi Nwankwo', scheduled_for: inHours(120), status: 'pending', agent_name: 'Ekemini Bassi' },
    { property_id: 'p6', client_name: 'Bassey Umoh', scheduled_for: inHours(140), status: 'confirmed', agent_name: 'Ime Akpan' },
    { property_id: 'p16', client_name: 'Tunde Bakare', scheduled_for: inHours(168), status: 'pending', agent_name: 'Ime Akpan' },
    { property_id: 'p8', client_name: 'Rita Odey', scheduled_for: inHours(200), status: 'pending', agent_name: 'Ekemini Bassi' },
  ];
  await insertAll('rep_inspection', inspections);

  // Email history: first replies for every replied conversation, recent follow-up
  // touches (keeps the due list to the real stragglers), overdue alerts for the 5
  // stalled deals, inspection reminders, and 2 realistic failures. 48 rows total.
  const propById = new Map(props.map((p) => [p.id, p]));
  type LogRow = { kind: string; recipient: string; subject: string; body: string; dispatched: boolean; note: string | null; created_at: string };
  const logs: LogRow[] = [];

  for (const q of inquiries.filter((x) => x.first_reply_sent_at)) {
    const p = q.property_id ? propById.get(q.property_id) : undefined;
    const first = q.name.split(' ')[0];
    logs.push({
      kind: 'first_reply',
      recipient: q.email,
      subject: p ? `About ${p.title}` : 'Your property inquiry',
      body: p
        ? `Thanks ${first} — straight from our board: ${p.title} — ${p.status.replace('_', ' ')} (${p.price_label}). Inspection slots this week are open; reply with a day that works.`
        : `Thanks ${first} — we have your note. Matching options are on the way; reply with your budget and preferred area to narrow it down.`,
      dispatched: true,
      note: `inquiry:${iid(q.name, q.email)}`,
      created_at: q.first_reply_sent_at!,
    });
  }

  const freshTouches: Array<[string, string, number]> = [
    ['Daniel Etuk', 'd.etuk@example.com', 20],
    ['Blessing Etim', 'blessing.etim@example.com', 17],
    ['Joseph Akan', 'joseph.akan@example.com', 15],
    ['Maryam Abdullahi', 'maryam.abdullahi@example.com', 13],
    ['Ekene Okeke', 'ekene.okeke@example.com', 11],
    ['Solomon Udo', 'solomon.udo@example.com', 9],
    ['Ime Obong', 'ime.obong@example.com', 7],
    ['Grace Udofia', 'grace.udofia@example.com', 5],
    ['Michael Umanah', 'michael.umanah@example.com', 3],
  ];
  for (const [name, email, hAgo] of freshTouches) {
    logs.push({
      kind: 'follow_up',
      recipient: email,
      subject: `Following up — ${name} inquiry`,
      body: `Hi ${name.split(' ')[0]}, circling back on the above — anything you need from us to keep this moving?`,
      dispatched: true,
      note: `inquiry:${iid(name, email)}`,
      created_at: hoursAgo(hAgo),
    });
  }

  const agentMail: Record<string, string> = {
    'Aisha Bello': 'aisha@agency.example',
    'Ime Akpan': 'ime@agency.example',
    'Mfon Udo': 'mfon@agency.example',
    'Uduak Okon': 'uduak@agency.example',
    'Ekemini Bassi': 'ekemini@agency.example',
  };
  const overdue = [
    ['d1', 'Daniel Etuk', 'search', 5, 13, daysAgo(5)],
    ['d2', 'Sam Edet', 'consent', 10, 14, daysAgo(3)],
    ['d3', 'Saviour Otu', 'search', 5, 9, daysAgo(4)],
    ['d4', 'Joseph Akan', 'docs', 7, 11, daysAgo(6)],
    ['d5', 'Grace Udofia', 'exchange', 14, 16, daysAgo(7)],
  ] as const;
  for (const [dealId, client, stage, sla, stalled, at] of overdue) {
    const deal = deals.find((d) => d.id === dealId)!;
    logs.push({
      kind: 'overdue_alert',
      recipient: agentMail[deal.agent_name] ?? 'ops@agency.example',
      subject: `Land search stalled ${stalled} days — ${client}`,
      body: `Land-search status: ${stage} (SLA ${sla} days). Last update ${stalled} days ago — touch the file today.`,
      dispatched: true,
      note: `deal:${dealId}`,
      created_at: at,
    });
  }

  const reminders: Array<[string, string, string]> = [
    ['Ada Essien', 'ada.essien@example.com', 'Reminder: inspection at The Haven Contemporary Villa, within 24 hours. Confirm your slot.'],
    ['Halima Yusuf', 'halima.yusuf@example.com', 'Reminder: inspection at Ewet Housing Estate Bungalow — please confirm you are still coming.'],
    ['Daniel Etuk', 'd.etuk@example.com', 'Reminder: Osongama parcel inspection tomorrow — reply YES to confirm.'],
    ['Victor Henshaw', 'victor.henshaw@example.com', 'Reminder: Uyo Estate 4-bed inspection tomorrow afternoon.'],
    ['Aniekan Bob', 'aniekan.bob@example.com', 'Thanks for coming to the Ewet terrace inspection — the offer window closes Friday.'],
    ['Blessing Etim', 'blessing.etim@example.com', 'Thanks for viewing the serviced apartment — let us know your verdict.'],
    ['Ime Obong', 'ime.obong@example.com', 'Thanks for viewing Southern Quarters — we will keep you posted on new stock.'],
  ];
  const reminderAt = [hoursAgo(20), hoursAgo(6), daysAgo(1), hoursAgo(8), daysAgo(3), daysAgo(5), daysAgo(8)];
  reminders.forEach(([name, email, body], i) => {
    logs.push({ kind: 'reminder', recipient: email, subject: 'Inspection reminder', body, dispatched: true, note: `inquiry:${iid(name, email)}`, created_at: reminderAt[i] });
  });

  logs.push(
    { kind: 'follow_up', recipient: 'segun.alabi@example.com', subject: 'Following up — Segun Alabi inquiry', body: 'Hi Segun, circling back on the land list.', dispatched: false, note: 'error: mailbox unavailable', created_at: daysAgo(5) },
    { kind: 'follow_up', recipient: 'peter.umoh@example.com', subject: 'Following up — Peter Umoh inquiry', body: 'Hi Peter, checking in on the survey.', dispatched: false, note: 'error: recipient rejected', created_at: daysAgo(6) },
  );
  await insertAll('rep_emaillog', logs);

  const countRows = async (table: string) => {
    const r = await db.database.from(table).select('id');
    if (!INSFORGE_OK(r)) throw new Error(`seed count failed on ${table}: ${errMsg(r.error)}`);
    return (r.data as unknown[])?.length ?? 0;
  };
  const seeded = {
    properties: await countRows('rep_property'),
    inquiries: await countRows('rep_inquiry'),
    deals: await countRows('rep_deal'),
    inspections: await countRows('rep_inspection'),
    emaillog: await countRows('rep_emaillog'),
  };
  const expected = { properties: props.length, inquiries: inquiries.length, deals: deals.length, inspections: inspections.length, emaillog: logs.length };
  for (const k of Object.keys(expected) as Array<keyof typeof expected>) {
    if (seeded[k] !== expected[k]) {
      console.error('seed verify failed', { expected, seeded });
      return json(res, 500, { ok: false, error: `seed verification failed on ${k}`, expected, seeded });
    }
  }
  json(res, 200, { ok: true, seeded });
}
