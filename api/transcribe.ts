import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json } from './_lib/cors.js';
import { requireAdmin } from './_lib/auth.js';

// Server-side speech-to-text for the voice agent. The browser records one
// utterance and posts the raw audio here; we forward it to Groq's Whisper
// (large-v3-turbo) for accuracy on Nigerian-accented English and place names.
// If no key is configured, GET reports unavailable and the client falls back to
// the browser's own recognizer instead.

export const config = { api: { bodyParser: false } };

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODEL = process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3-turbo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return json(res, 200, { provider: process.env.GROQ_API_KEY ? 'groq' : null, model: MODEL });
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST only' });
  if (!requireAdmin(req, res)) return;

  const key = process.env.GROQ_API_KEY;
  if (!key) return json(res, 503, { error: 'Speech-to-text is not configured.' });

  let buf: Buffer;
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    buf = Buffer.concat(chunks);
  } catch {
    return json(res, 400, { error: 'Could not read audio body.' });
  }
  if (buf.length < 1000) return json(res, 400, { error: 'Audio too short.' });
  if (buf.length > 12 * 1024 * 1024) return json(res, 413, { error: 'Audio too large.' });

  const type = String(req.headers['content-type'] ?? 'audio/webm').split(';')[0];
  const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'mp4' : type.includes('wav') ? 'wav' : 'webm';

  try {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buf)], { type }), `utterance.${ext}`);
    form.append('model', MODEL);
    form.append('language', 'en');
    form.append('response_format', 'json');
    form.append('temperature', '0');

    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      console.error('transcribe', r.status, await r.text().catch(() => ''));
      return json(res, 502, { error: 'Speech-to-text failed.' });
    }
    const j = (await r.json()) as { text?: string };
    const text = (j.text ?? '').trim();
    return json(res, 200, { text });
  } catch (e) {
    console.error('transcribe', e);
    return json(res, 502, { error: 'Speech-to-text failed.' });
  }
}
