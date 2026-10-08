import nodemailer from 'nodemailer';
import { errMsg } from './db.js';

export type DispatchResult = { ok: boolean; to: string; error?: string };

export async function sendEmail(opts: {
  to: string | null;
  subject: string;
  body: string;
  kind: string;
  note?: string;
}): Promise<{ result: DispatchResult; logBody: string }> {
  const demoInbox = process.env.REP_DEMO_INBOX?.trim() ?? '';
  const logBody = opts.body;
  let to = opts.to || '';
  if (demoInbox) {
    to = demoInbox; // demo mode: deliver to the verified demo inbox; real delivery when REP_DEMO_INBOX is unset
  }
  if (!to) {
    return { result: { ok: false, to: '', error: 'No recipient and no REP_DEMO_INBOX set' }, logBody };
  }
  try {
    const port = Number(process.env.SMTP_PORT);
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await t.sendMail({ from: process.env.EMAIL_FROM, to, subject: opts.subject, text: logBody });
    return { result: { ok: true, to }, logBody };
  } catch (e) {
    return { result: { ok: false, to, error: errMsg(e) }, logBody };
  }
}