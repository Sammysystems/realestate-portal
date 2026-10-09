import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';
import { buildBoard } from './_lib/board.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });
  if (!requireAdmin(req, res)) return;

  const board = await buildBoard();
  json(res, 200, board);
}
