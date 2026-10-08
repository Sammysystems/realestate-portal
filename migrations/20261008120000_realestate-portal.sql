-- realestate-portal — schema (shared InsForge DB, lowercase distinct rep_* tables)
-- Run once in the InsForge SQL editor. All tables are safe to re-run.

create table if not exists rep_property (
  id text primary key,
  title text not null,
  address text,
  price_label text,
  category text not null default 'Residential',
  status text not null default 'for_sale',
  agent_name text,
  created_at timestamptz not null default now()
);

create table if not exists rep_inquiry (
  id bigint generated always as identity primary key,
  property_id text references rep_property(id) on delete set null,
  name text not null,
  phone text,
  email text,
  channel text not null default 'web',
  status text not null default 'new',
  first_reply_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists rep_deal (
  id text primary key,
  property_id text references rep_property(id) on delete set null,
  inquiry_id bigint references rep_inquiry(id) on delete set null,
  client_name text,
  search_stage text not null default 'new',
  docs jsonb not null default '[]'::jsonb,
  agent_name text,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists rep_inspection (
  id bigint generated always as identity primary key,
  property_id text references rep_property(id) on delete set null,
  inquiry_id bigint references rep_inquiry(id) on delete set null,
  client_name text,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  agent_name text,
  created_at timestamptz not null default now()
);

create table if not exists rep_emaillog (
  id bigint generated always as identity primary key,
  kind text not null,
  recipient text,
  subject text,
  body text,
  dispatched boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);