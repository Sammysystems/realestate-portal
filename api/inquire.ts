import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, INSFORGE_OK } from './_lib/db.js';
import { json } from './_lib/cors.js';
import { buildAutoReply, matchProperty, parseInquiry, polishReply } from './_lib/reply.js';
import { sendEmail } from './_lib/mail.js';
import type { Property } from './_lib/compute.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  const parsed = parseInquiry(req.body ?? {});
  if (!parsed.name || !parsed.phone) {
    return json(res, 400, { error: 'name and phone are required' });
  }
  if (parsed.message.length < 2) {
    return json(res, 400, { error: 'message is required' });
  }

  const propsRes = await db.database.from('rep_property').select('*');
  if (!INSFORGE_OK(propsRes)) return json(res, 500, { error: 'DB read failed' });
  const matched = matchProperty((propsRes.data ?? []) as Property[], parsed.message);
  parsed.property = matched;

  const insert = await db.database.from('rep_inquiry').insert([{
    property_id: matched?.id ?? null,
    name: parsed.name,
    phone: parsed.phone,
    email: parsed.email || null,
    message: parsed.message,
    channel: 'web',
    status: 'new',
  }]);
  if (!INSFORGE_OK(insert)) {
    console.error('inquire insert', insert);
    return json(res, 500, { error: 'Failed to save inquiry' });
  }
  const inquiryRows = (insert.data ?? []) as unknown as Array<{ id: number }>;
  const inquiryId = inquiryRows[0]?.id;

  // Auto first-reply: facts deterministic, wording optionally polished by LLM.
  const draft = buildAutoReply(parsed);
  const final = await polishReply(draft);
  const { result, logBody } = await sendEmail({
    to: parsed.email || null,
    subject: final.subject,
    body: final.body,
    kind: 'first_reply',
    note: `inquiry:${inquiryId}`,
  });

  if (result.ok && inquiryId) {
    await db.database
      .from('rep_inquiry')
      .update({ first_reply_sent_at: new Date().toISOString(), status: 'replied' })
      .eq('id', inquiryId);
  }

  const logged = await db.database.from('rep_emaillog').insert([{
    kind: 'first_reply',
    recipient: result.to,
    subject: final.subject,
    body: logBody,
    dispatched: result.ok,
    note: result.error ? `error:${result.error}` : `inquiry:${inquiryId}`,
  }]);

  json(res, 200, {
    ok: true,
    inquiry_id: inquiryId,
    matched_property: matched?.title ?? null,
    reply: { subject: final.subject, body: final.body, sent: result.ok, to: result.to },
    logged: INSFORGE_OK(logged),
  });
}