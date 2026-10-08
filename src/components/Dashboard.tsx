import { Badge, Card, Empty, Stat } from './ui';
import type { Board } from '../types';

export function Dashboard({
  board,
  running,
  onAction,
}: {
  board: Board;
  running: string | null;
  onAction: (type: 'follow-ups' | 'overdue-alerts' | 'reminders') => void;
}) {
  const { stats, due } = board;
  const flags = due.overdue_alerts.length + due.followups.length + due.reminders.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Good morning, ops desk</h2>
          <p className="text-sm text-slate-400">
            {flags === 0
              ? 'Nothing owed right now. Everything is moving.'
              : `${flags} item${flags === 1 ? '' : 's'} need a nudge right now — fire them below.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label={`Follow-ups due (${due.followups.length})`}
            disabled={due.followups.length === 0}
            running={running === 'follow-ups'}
            onClick={() => onAction('follow-ups')}
          />
          <ActionButton
            label={`Overdue alerts (${due.overdue_alerts.length})`}
            disabled={due.overdue_alerts.length === 0}
            running={running === 'overdue-alerts'}
            tone="red"
            onClick={() => onAction('overdue-alerts')}
          />
          <ActionButton
            label={`Inspection reminders (${due.reminders.length})`}
            disabled={due.reminders.length === 0}
            running={running === 'reminders'}
            tone="amber"
            onClick={() => onAction('reminders')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Properties" value={stats.properties} />
        <Stat label="Open inquiries" value={stats.open_inquiries} />
        <Stat label="Unanswered 4h+" value={stats.unanswered_flagged} tone={stats.unanswered_flagged ? 'red' : 'slate'} />
        <Stat label="Overdue land searches" value={stats.overdue_deals} tone={stats.overdue_deals ? 'red' : 'slate'} />
        <Stat label="Inspections today" value={stats.inspections_today} />
        <Stat label="Inspections tomorrow" value={stats.inspections_tomorrow} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mb-2 text-sm font-medium text-slate-300">Overdue land searches</h3>
          {due.overdue_alerts.length === 0 ? (
            <Empty>None right now.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {due.overdue_alerts.map((d) => (
                <li key={d.deal_id} className="flex items-center justify-between gap-2">
                  <span>{d.client ?? d.deal_id}</span>
                  <Badge tone="red">{Math.round(d.overdue_by_days)} days over</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="mb-2 text-sm font-medium text-slate-300">Inquiries waiting on a touch</h3>
          {due.followups.length === 0 ? (
            <Empty>All inquiries answered in time.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {due.followups.map((f) => (
                <li key={f.inquiry_id} className="flex items-center justify-between gap-2">
                  <span>{f.name}</span>
                  <span className="text-xs text-slate-400">{f.last_touch_hours}h since touch</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="mb-2 text-sm font-medium text-slate-300">Inspections needing a reminder</h3>
          {due.reminders.length === 0 ? (
            <Empty>Reminders all sent.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {due.reminders.map((r) => (
                <li key={r.inspection_id} className="flex items-center justify-between gap-2">
                  <span>{r.client ?? 'Client'}</span>
                  <span className="text-xs text-slate-400">{r.hours_until >= 0 ? `in ${r.hours_until}h` : 'passed'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  running,
  disabled,
  tone,
}: {
  label: string;
  onClick: () => void;
  running: boolean;
  disabled: boolean;
  tone?: 'red' | 'amber';
}) {
  const base = 'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40';
  const style =
    tone === 'red'
      ? 'bg-red-600/80 hover:bg-red-500 text-white'
      : tone === 'amber'
        ? 'bg-amber-600/80 hover:bg-amber-500 text-white'
        : 'bg-sky-600 hover:bg-sky-500 text-white';
  return (
    <button onClick={onClick} disabled={disabled || running} className={`${base} ${style}`}>
      {running && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {label}
    </button>
  );
}