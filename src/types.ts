export type Property = {
  id: string;
  title: string;
  address: string | null;
  price_label: string | null;
  category: string;
  status: string;
  agent_name: string | null;
  image_url: string | null;
  created_at: string;
};

export type Inquiry = {
  id: number;
  property_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  channel: string;
  status: string;
  first_reply_sent_at: string | null;
  created_at: string;
  hours_old: number;
  untouched_hours: number;
  has_first_reply: boolean;
  attention: boolean;
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
  stalled_days: number;
  sla_days: number;
  overdue: boolean;
  overdue_by_days: number;
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

export type Due = {
  followups: Array<{ inquiry_id: number; name: string; last_touch_hours: number }>;
  reminders: Array<{ inspection_id: number; client: string | null; hours_until: number }>;
  overdue_alerts: Array<{ deal_id: string; client: string | null; stalled_days: number; overdue_by_days: number }>;
};

export type Stats = {
  properties: number;
  open_inquiries: number;
  unanswered_flagged: number;
  overdue_deals: number;
  inspections_today: number;
  inspections_tomorrow: number;
};

export type Board = {
  properties: Property[];
  inquiries: Inquiry[];
  deals: Deal[];
  inspections: Inspection[];
  log: EmailLog[];
  due: Due;
  stats: Stats;
};

export type SentEntry = { kind: string; to: string; ok: boolean; error?: string; note?: string };