import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, INSFORGE_OK } from './_lib/db.js';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return json(res, 200, {});
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const r = await db.database
      .from('rep_inspection')
      .select('*')
      .order('scheduled_for', { ascending: true });
    if (!INSFORGE_OK(r)) return json(res, 500, { error: 'DB read failed' });
    return json(res, 200, { inspections: r.data });
  }

  if (req.method === 'POST') {
    const b = req.body ?? {};
    if (!b.scheduled_for || !b.client_name) {
      return json(res, 400, { error: 'scheduled_for and client_name are required' });
    }
    const r = await db.database.from('rep_inspection').insert([{
      property_id: b.property_id ?? null,
      inquiry_id: b.inquiry_id ?? null,
      client_name: String(b.client_name),
      scheduled_for: new Date(String(b.scheduled_for)).toISOString(),
      status: b.status ?? 'pending',
      agent_name: b.agent_name ?? null,
    }]);
    if (!INSFORGE_OK(r)) return json(res, 500, { error: 'DB insert failed' });
    return json(res, 200, { inspection: r.data?.[0] });
  }

  if (req.method === 'PATCH') {
    const b = req.body ?? {};
    const id = Number(b.id ?? req.query.id);
    if (!id) return json(res, 400, { error: 'id is required' });
    const patch: Record<string, unknown> = {};
    for (const k of ['client_name', 'status', 'agent_name', 'property_id']) {
      if (b[k] !== undefined) patch[k] = b[k];
    }
    if (b.scheduled_for) patch.scheduled_for = new Date(String(b.scheduled_for)).toISOString();
    const r = await db.database.from('rep_inspection').update(patch).eq('id', id);
    if (!INSFORGE_OK(r)) return json(res, 500, { error: 'DB update failed' });
    return json(res, 200, { inspection: r.data?.[0] });
  }

  json(res, 405, { error: 'GET, POST or PATCH' });
}