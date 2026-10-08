import { Avatar, Badge, Button, Card, Empty, Stat } from './ui';
import { Bars, CHART_COLORS, Donut, LatencyGauge, type Segment } from './charts';
import type { Board } from '../types';
import { BellRing, CalendarClock, Send } from 'lucide-react';

const STAGES = ['new', 'search', 'docs', 'consent', 'exchange'];

export function Dashboard({
  board,
  running,
  onAction,
}: {
  board: Board;
  running: string | null;
  onAction: (type: 'follow-ups' | 'overdue-alerts' | 'reminders') => void;
}) {
  const { stats, due, deals, inquiries } = board;
  const flags = due.overdue_alerts.length + due.followups.length + due.reminders.length;

  const stageSegments: Segment[] = STAGES.map((s, i) => ({
    label: s,
    value: deals.filter((d) => d.search_stage === s).length,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((s) => s.value > 0);

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const countsByDay = new Map<string, number>();
  for (const i of inquiries) countsByDay.set(dayKey(new Date(i.created_at)), (countsByDay.get(dayKey(new Date(i.created_at))) ?? 0) + 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bars = Array.from({ length: 14 }, (_, idx) => {
    const d = new Date(today.getTime() - (13 - idx) * 86_400_000);
    return { label: String(d.getDate()), value: countsByDay.get(dayKey(d)) ?? 0 };
  });

  const replied = inquiries.filter((i) => i.first_reply_sent_at);
  const avgReply =
    replied.reduce((sum, i) => sum + (new Date(i.first_reply_sent_at!).getTime() - new Date(i.created_at).getTime()) / 3_600_000, 0) /
    Math.max(1, replied.length);

  return (
    <div className="space-y-5">
      {/* dispatch strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-hair">
        <p className="mr-auto text-sm text-ink-soft">
          {flags === 0 ? (
            <>Nothing owed right now. Everything is moving.</>
          ) : (
            <>
              <span className="font-semibold text-ink">{flags}</span> item{flags === 1 ? '' : 's'} need
              {flags === 1 ? 's' : ''} a nudge right now — fire them below.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={due.followups.length === 0}
            loading={running === 'follow-ups'}
            onClick={() => onAction('follow-ups')}
          >
            <Send className="h-3.5 w-3.5" />
            Follow-ups ({due.followups.length})
          </Button>
          <Button
            variant="danger"
            disabled={due.overdue_alerts.length === 0}
            loading={running === 'overdue-alerts'}
            onClick={() => onAction('overdue-alerts')}
          >
            <BellRing className="h-3.5 w-3.5" />
            Overdue alerts ({due.overdue_alerts.length})
          </Button>
          <Button
            variant="ochre"
            disabled={due.reminders.length === 0}
            loading={running === 'reminders'}
            onClick={() => onAction('reminders')}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Reminders ({due.reminders.length})
          </Button>
        </div>
      </div>

      {/* metric chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Properties" value={stats.properties} />
        <Stat label="Open inquiries" value={stats.open_inquiries} />
        <Stat label="Unanswered 4h+" value={stats.unanswered_flagged} tone={stats.unanswered_flagged ? 'red' : 'ink'} />
        <Stat label="Overdue land searches" value={stats.overdue_deals} tone={stats.overdue_deals ? 'red' : 'ink'} />
        <Stat label="Inspections today" value={stats.inspections_today} />
        <Stat label="Inspections tomorrow" value={stats.inspections_tomorrow} />
      </div>

      {/* analytics band */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-ink">Land search pipeline</h3>
          {stageSegments.length === 0 ? (
            <Empty>No deals yet.</Empty>
          ) : (
            <Donut segments={stageSegments} centerValue={String(deals.length)} centerLabel="deals" size={132} />
          )}
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-ink">Inquiries, last 14 days</h3>
          <Bars data={bars} />
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-ink">First-reply latency</h3>
          {replied.length === 0 ? (
            <Empty>No first replies logged yet — every new inquiry triggers an auto first-reply within seconds.</Empty>
          ) : (
            <LatencyGauge hours={avgReply} />
          )}
        </Card>
      </div>

      {/* needs a nudge */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Overdue land searches</h3>
            <Badge tone={due.overdue_alerts.length ? 'red' : 'green'}>{due.overdue_alerts.length}</Badge>
          </div>
          {due.overdue_alerts.length === 0 ? (
            <Empty>None right now.</Empty>
          ) : (
            <ul className="-mx-1 divide-y divide-line">
              {due.overdue_alerts.map((d) => (
                <li key={d.deal_id} className="flex items-center gap-3 px-1 py-2.5">
                  <Avatar name={d.client ?? d.deal_id} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.client ?? d.deal_id}</span>
                  <Badge tone="red">
                    {Math.round(d.overdue_by_days)} day{Math.round(d.overdue_by_days) === 1 ? '' : 's'} over
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Inquiries waiting on a touch</h3>
            <Badge tone={due.followups.length ? 'amber' : 'green'}>{due.followups.length}</Badge>
          </div>
          {due.followups.length === 0 ? (
            <Empty>All inquiries answered in time.</Empty>
          ) : (
            <ul className="-mx-1 divide-y divide-line">
              {due.followups.map((f) => (
                <li key={f.inquiry_id} className="flex items-center gap-3 px-1 py-2.5">
                  <Avatar name={f.name} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
                  <span className="text-xs whitespace-nowrap text-ink-faint tabular-nums">{f.last_touch_hours}h since touch</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Inspections needing a reminder</h3>
            <Badge tone={due.reminders.length ? 'amber' : 'green'}>{due.reminders.length}</Badge>
          </div>
          {due.reminders.length === 0 ? (
            <Empty>Reminders all sent.</Empty>
          ) : (
            <ul className="-mx-1 divide-y divide-line">
              {due.reminders.map((r) => (
                <li key={r.inspection_id} className="flex items-center gap-3 px-1 py-2.5">
                  <Avatar name={r.client ?? 'Client'} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.client ?? 'Client'}</span>
                  <span className="text-xs whitespace-nowrap text-ink-faint tabular-nums">
                    {r.hours_until >= 0 ? `in ${r.hours_until}h` : 'passed'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
