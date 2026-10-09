import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';
import { buildBoard } from './_lib/board.js';
import { answerQuestion, buildDigest } from './_lib/ask.js';

const MAX_QUESTION = 500;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!requireAdmin(req, res)) return;

  const question = String(req.body?.question ?? '').trim();
  if (!question) return json(res, 400, { error: 'question is required' });
  if (question.length > MAX_QUESTION) return json(res, 400, { error: 'question is too long' });

  try {
    const board = await buildBoard();
    const digest = buildDigest(board);
    const { answer, model, email } = await answerQuestion(question, digest);
    return json(res, 200, {
      answer,
      used: `your live board · ${digest.propertyCount} properties · ${digest.asOf}`,
      model,
      email,
    });
  } catch (e) {
    console.error('ask', e);
    return json(res, 502, { error: 'The desk assistant is unavailable right now.' });
  }
}
