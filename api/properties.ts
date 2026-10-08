import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, INSFORGE_OK } from './_lib/db.js';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return json(res, 200, {});
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const r = await db.database
      .from('rep_property')
      .select('*')
      .order('created_at', { ascending: false });
    if (!INSFORGE_OK(r)) return json(res, 500, { error: 'DB read failed' });
    return json(res, 200, { properties: r.data });
  }

  if (req.method === 'POST') {
    const b = req.body ?? {};
    if (!b.title) return json(res, 400, { error: 'title is required' });
    const r = await db.database.from('rep_property').insert([{
      id: `p-${Date.now().toString(36)}`,
      title: String(b.title),
      address: b.address ?? null,
      price_label: b.price_label ?? null,
      category: b.category ?? 'Residential',
      status: b.status ?? 'for_sale',
      agent_name: b.agent_name ?? null,
    }]);
    if (!INSFORGE_OK(r)) return json(res, 500, { error: 'DB insert failed' });
    return json(res, 200, { property: r.data?.[0] });
  }

  if (req.method === 'PATCH') {
    const b = req.body ?? {};
    const id = String(b.id ?? req.query.id ?? '');
    if (!id) return json(res, 400, { error: 'id is required' });
    const patch: Record<string, unknown> = {};
    for (const k of ['title', 'address', 'price_label', 'category', 'status', 'agent_name']) {
      if (b[k] !== undefined) patch[k] = b[k];
    }
    const r = await db.database.from('rep_property').update(patch).eq('id', id);
    if (!INSFORGE_OK(r)) return json(res, 500, { error: 'DB update failed' });
    return json(res, 200, { property: r.data?.[0] });
  }

  json(res, 405, { error: 'GET, POST or PATCH' });
}