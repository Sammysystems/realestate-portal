import { Badge, Card, Empty } from './ui';
import type { Inquiry } from '../types';

function fmtClock(h: number) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
}

function replyLatency(i: Inquiry): string | null {
  if (!i.first_reply_sent_at) return null;
  const ms = new Date(i.first_reply_sent_at).getTime() - new Date(i.created_at).getTime();
  const h = Math.max(0, ms / 3_600_000);
  return `reply ${fmtClock(h)} after`;
}

export function Inquiries({ inquiries, propertyTitles }: { inquiries: Inquiry[]; propertyTitles: Record<string, string> }) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Inquiry pipeline</h2>
      {inquiries.length === 0 && (
        <Card>
          <Empty>No inquiries yet.</Empty>
        </Card>
      )}
      {inquiries.map((i) => (
        <Card key={i.id} className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-200">{i.name}</span>
              {i.attention ? <Badge tone="red">Unanswered {fmtClock(i.hours_old)}</Badge> : i.has_first_reply ? <Badge tone="green">Replied</Badge> : <Badge tone="amber">New</Badge>}
              {propertyTitles[i.property_id ?? ''] && <span className="text-xs text-slate-500">→ {propertyTitles[i.property_id ?? '']}</span>}
            </div>
            {i.message && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{i.message}</p>}
            <p className="mt-1 text-xs text-slate-500">
              {i.phone}
              {i.email ? ` · ${i.email}` : ''} · {i.channel} · arrived {fmtClock(i.hours_old)} ago
              {replyLatency(i) ? ` · ${replyLatency(i)}` : ''}
            </p>
          </div>
          <Badge tone="slate">{i.status}</Badge>
        </Card>
      ))}
    </div>
  );
}