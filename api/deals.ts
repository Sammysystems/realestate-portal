import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, INSFORGE_OK } from './_lib/db.js';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return json(res, 200, {});
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const r = await db.database.from('rep_deal').select('*').order('last_updated_at', { ascending: false });
    if (!INSFORGE_OK(r)) return json(res, 500, { error: 'DB read failed' });
    return json(res, 200, { deals: r.data });
  }

  if (req.method === 'POST') {
    const b = req.body ?? {};
    if (!b.client_name) return json(res, 400, { error: 'client_name is required' });
    const r = await db.database.from('rep_deal').insert([{
      id: `d-${Date.now().toString(36)}`,
      property_id: b.property_id ?? null,
      inquiry_id: b.inquiry_id ?? null,
      client_name: String(b.client_name),
      search_stage: b.search_stage ?? 'new',
      docs: b.docs ?? [],
      agent_name: b.agent_name ?? null,
      last_updated_at: new Date().toISOString(),
    }]);
    if (!INSFORGE_OK(r)) return json(res, 500, { error: 'DB insert failed' });
    return json(res, 200, { deal: r.data?.[0] });
  }

  if (req.method === 'PATCH') {
    const b = req.body ?? {};
    const id = String(b.id ?? req.query.id ?? '');
    if (!id) return json(res, 400, { error: 'id is required' });
    const patch: Record<string, unknown> = {};
    for (const k of ['client_name', 'search_stage', 'docs', 'agent_name', 'property_id']) {
      if (b[k] !== undefined) patch[k] = b[k];
    }
    // Any agent touch resets the stall clock.
    patch.last_updated_at = new Date().toISOString();
    const r = await db.database.from('rep_deal').update(patch).eq('id', id);
    if (!INSFORGE_OK(r)) return json(res, 500, { error: 'DB update failed' });
    return json(res, 200, { deal: r.data?.[0] });
  }

  json(res, 405, { error: 'GET, POST or PATCH' });
}