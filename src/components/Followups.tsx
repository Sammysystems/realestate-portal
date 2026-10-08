import { Avatar, Badge, Card, Empty, TableShell, TD_CLS, TH_CLS, TR_CLS } from './ui';
import { Bars } from './charts';
import type { Board } from '../types';

const KIND_BADGE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'slate'> = {
  first_reply: 'green',
  follow_up: 'blue',
  overdue_alert: 'red',
  reminder: 'amber',
};

export function Followups({ board }: { board: Board }) {
  const { due } = board;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Inquiries that are open and haven&rsquo;t had a touch in 24h+. Everything here fires on one click from the
        dashboard.
      </p>
      {due.followups.length === 0 ? (
        <Card>
          <Empty>Nothing due. Every open inquiry has been touched within the last 24h.</Empty>
        </Card>
      ) : (
        due.followups.map((f) => (
          <Card key={f.inquiry_id} className="card-lift flex items-center gap-3">
            <Avatar name={f.name} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{f.name}</p>
              <p className="text-xs text-ink-faint">inquiry #{f.inquiry_id}</p>
            </div>
            <Badge tone="amber">{f.last_touch_hours}h without a touch</Badge>
          </Card>
        ))
      )}
    </div>
  );
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function Log({ log }: { log: Board['log'] }) {
  const countsByDay = new Map<string, number>();
  for (const l of log) {
    const k = dayKey(new Date(l.created_at));
    countsByDay.set(k, (countsByDay.get(k) ?? 0) + 1);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bars = Array.from({ length: 14 }, (_, idx) => {
    const d = new Date(today.getTime() - (13 - idx) * 86_400_000);
    return { label: String(d.getDate()), value: countsByDay.get(dayKey(d)) ?? 0 };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-card px-4 py-3.5 shadow-hair">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Dispatches, last 14 days</h2>
          <span className="text-xs text-ink-faint tabular-nums">{log.length} emails logged</span>
        </div>
        <Bars data={bars} height={72} compact />
      </div>

      <TableShell title="Every dispatch">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-linen-warm/50">
              <th className={TH_CLS}>Time</th>
              <th className={TH_CLS}>Kind</th>
              <th className={TH_CLS}>Recipient</th>
              <th className={TH_CLS}>Subject</th>
              <th className={TH_CLS}>State</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6">
                  <Empty>No emails dispatched yet.</Empty>
                </td>
              </tr>
            )}
            {log.map((l) => (
              <tr key={l.id} className={TR_CLS}>
                <td className={`${TD_CLS} text-xs whitespace-nowrap text-ink-faint tabular-nums`}>
                  {new Date(l.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className={TD_CLS}>
                  <Badge tone={KIND_BADGE[l.kind] ?? 'slate'}>{l.kind.replace('_', ' ')}</Badge>
                </td>
                <td className={`${TD_CLS} text-ink-soft`}>{l.recipient ?? '—'}</td>
                <td className={`${TD_CLS} max-w-[320px] truncate`}>{l.subject}</td>
                <td className={TD_CLS}>
                  {l.dispatched ? <Badge tone="green">Sent</Badge> : <Badge tone="red">Failed</Badge>}
                  {l.note?.startsWith('error:') && (
                    <span className="ml-2 text-xs text-danger-ink">{(l.note ?? '').slice(6)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
