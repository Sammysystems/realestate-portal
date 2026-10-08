import { Avatar, Badge, Card, Empty } from './ui';
import type { Inquiry } from '../types';

function fmtClock(h: number) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
}

function replyHours(i: Inquiry): number | null {
  if (!i.first_reply_sent_at) return null;
  return Math.max(0, (new Date(i.first_reply_sent_at).getTime() - new Date(i.created_at).getTime()) / 3_600_000);
}

export function Inquiries({ inquiries, propertyTitles }: { inquiries: Inquiry[]; propertyTitles: Record<string, string> }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink-soft">Newest first. Latency measured against the 4h first-reply SLA.</p>
        <span className="text-xs text-ink-faint tabular-nums">{inquiries.length} total</span>
      </div>

      {inquiries.length === 0 && (
        <Card>
          <Empty>No inquiries yet.</Empty>
        </Card>
      )}

      {inquiries.map((i) => {
        const lat = replyHours(i);
        const prop = propertyTitles[i.property_id ?? ''];
        return (
          <Card key={i.id} className="card-lift flex flex-wrap items-start gap-3">
            <Avatar name={i.name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{i.name}</span>
                {i.attention ? (
                  <Badge tone="red">Unanswered {fmtClock(i.hours_old)}</Badge>
                ) : i.has_first_reply ? (
                  <Badge tone="green">Replied</Badge>
                ) : (
                  <Badge tone="amber">New</Badge>
                )}
                {prop && <span className="text-xs text-ink-faint">→ {prop}</span>}
              </div>
              {i.message && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{i.message}</p>}
              <p className="mt-1 text-xs text-ink-faint">
                {i.phone}
                {i.email ? ` · ${i.email}` : ''} · {i.channel} · arrived {fmtClock(i.hours_old)} ago
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Badge tone="slate">{i.status.replace('_', ' ')}</Badge>
              {lat !== null && (
                <Badge tone={lat <= 4 ? 'green' : 'amber'}>reply in {fmtClock(lat)}</Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
