import type { VercelRequest, VercelResponse } from '@vercel/node';

export function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export function isPreflight(req: VercelRequest): boolean {
  return req.method === 'OPTIONS';
}

export function json(res: VercelResponse, status: number, body: unknown) {
  cors(res).status(status).json(body);
}