import { createAdminClient } from '@insforge/sdk';

export const db = createAdminClient({
  baseUrl: process.env.INSFORGE_URL!,
  apiKey: process.env.INSFORGE_API_KEY!,
});

export const INSFORGE_OK = (d: { data?: unknown; error?: unknown }) =>
  d && !d.error;

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));