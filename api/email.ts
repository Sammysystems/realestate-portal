import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';
import { sendEmail } from './_lib/mail.js';
import { db, INSFORGE_OK } from './_lib/db.js';

// Assistant-initiated email: the owner confirms a draft in the chat and this
// endpoint dispatches it through the same SMTP path as inquiries and follow-up
// actions, logged to rep_emaillog (kind "assistant"). REP_DEMO_INBOX still
// gates delivery to the demo inbox for safe testing.

const MAX_BODY = 20000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!requireAdmin(req, res)) return;

  const to = String(req.body?.to ?? '').trim();
  const subject = String(req.body?.subject ?? '').trim();
  const body = String(req.body?.body ?? '').trim();
  if (!to || !subject || !body) return json(res, 400, { error: 'to, subject and body are required.' });
  if (body.length > MAX_BODY) return json(res, 413, { error: 'Email body is too large.' });

  const { result, logBody } = await sendEmail({ to, subject, body, kind: 'assistant' });

  const ins = await db.database
    .from('rep_emaillog')
    .insert([{
      kind: 'assistant',
      recipient: result.to,
      subject,
      body: logBody,
      dispatched: result.ok,
      note: result.error ? `error:${result.error}` : null,
    }]);
  if (!INSFORGE_OK(ins)) console.error('email insert', ins);

  return json(res, result.ok ? 200 : 502, {
    ok: result.ok,
    to: result.to,
    error: result.error ?? null,
  });
}