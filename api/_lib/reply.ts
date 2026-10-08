import type { Property } from './compute.js';

// Deterministic auto-first-reply. Facts (property, price, status, agent) always
// come from the matched DB row; the LLM — if configured — only polishes wording
// and is skipped silently on any error, timeout, or missing key (lh-concierge
// discipline: hallucination must be structurally impossible).

const INTENT_WORDS: Array<[RegExp, string]> = [
  [/\b(rent|renting|lease|leasing|tenant)\b/i, 'rent'],
  [/\b(invest|investing|yield|roi|appreciation)\b/i, 'invest'],
  [/\b(buy|buying|purchase|acquire|own)\b/i, 'buy'],
  [/\b(search|looking|check|availability|available)\b/i, 'search'],
];

export type ParsedReply = {
  intent: string;
  property: Property | null;
  name: string;
  phone: string;
  email: string;
  message: string;
};

export function parseInquiry(body: Record<string, unknown>): ParsedReply {
  return {
    intent: detectIntent(String(body.message ?? '')),
    property: null,
    name: String(body.name ?? '').trim(),
    phone: String(body.phone ?? '').trim(),
    email: String(body.email ?? '').trim(),
    message: String(body.message ?? '').trim().slice(0, 1000),
  };
}

export function detectIntent(message: string): string {
  for (const [re, k] of INTENT_WORDS) if (re.test(message)) return k;
  return 'general';
}

const STOP_WORDS = new Set(['the', 'for', 'and', 'are', 'not', 'you', 'any', 'our', 'new', 'all']);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function matchProperty(properties: Property[], message: string): Property | null {
  const msg = message.toLowerCase();
  for (const p of properties) {
    const titleWords = p.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    if (titleWords.some((w) => new RegExp(`\\b${escapeRe(w)}\\b`).test(msg))) return p;
  }
  return null;
}

const STATUS_LABEL: Record<string, string> = {
  for_sale: 'on the market',
  under_offer: 'under offer',
  let: 'let out',
  sold: 'sold',
};

export function buildAutoReply(p: ParsedReply): { subject: string; body: string } {
  const salutation = p.name ? `${p.name}, ` : '';
  if (!p.property) {
    return {
      subject: `Thanks for reaching out about ${p.property ? '' : 'properties'} at our agency`,
      body:
        `Hi ${salutation}\n\n` +
        `Thanks for your message — we've received it and one of our agents is on it.\n\n` +
        `While you wait, you can book an inspection any time on the link below, or reply to this email and we'll match you to listings that fit.\n\n` +
        `Agency Ops Desk`,
    };
  }
  const price = p.property.price_label ? ` (${p.property.price_label})` : '';
  return {
    subject: `About ${p.property.title}`,
    body:
      `Hi ${salutation}\n\n` +
      `Thanks for your message. Straight from our board:\n\n` +
      `${p.property.title} — ${p.property.status ? STATUS_LABEL[p.property.status] ?? p.property.status : 'on the market'}${price}.\n` +
      `${p.property.address ? `Location: ${p.property.address}\n` : ''}` +
      `${p.property.agent_name ? `Handled by: ${p.property.agent_name}\n` : ''}\n` +
      `If you'd like to see it, book an inspection here and we'll confirm your slot: ${process.env.APP_URL ?? '#'}/book\n\n` +
      `Reply to this email anytime for more detail.\n\n` +
      `Agency Ops Desk`,
  };
}

const POLISH_SYSTEM =
  'You write the client-facing reply for a real-estate agency. Rewrite ONLY the reply you are given into a warmer, more natural version. ' +
  'Keep every fact exactly as provided: property name, price, location, status and agent name may not be changed or invented. ' +
  'Output the reply text only - no preamble, no "here is", no "I polished", no quoting the original, no commentary, no instructions. ' +
  'One short paragraph plus a short closing line. Address the client by name if present. No emojis.';

export async function polishReply(draft: { subject: string; body: string }): Promise<{ subject: string; body: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_CHAT_MODEL;
  if (!key || !model) return draft;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: POLISH_SYSTEM },
          { role: 'user', content: `Subject: ${draft.subject}\n\n${draft.body}` },
        ],
        max_tokens: 220,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return draft;
    const j = await res.json();
    const text = j?.choices?.[0]?.message?.content?.trim();
    if (!text) return draft;
    return { subject: draft.subject, body: text };
  } catch {
    return draft; // model off, rate-limited, or slow: deterministic reply stands
  }
}