import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json } from './cors.js';

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.REP_ADMIN_TOKEN ?? '';
  if (!expected || token !== expected) {
    json(res, 401, { error: 'Admin token required' });
    return false;
  }
  return true;
}