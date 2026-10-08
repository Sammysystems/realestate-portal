import { Badge, Card, Empty } from './ui';
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
      <h2 className="font-semibold">Follow-up center</h2>
      <p className="text-sm text-slate-400">
        Inquiries that are open and haven't had a touch in 24h+. Everything here fires on one click from the dashboard.
      </p>
      {due.followups.length === 0 ? (
        <Card>
          <Empty>Nothing due. Every open inquiry has been touched within the last 24h.</Empty>
        </Card>
      ) : (
        due.followups.map((f) => (
          <Card key={f.inquiry_id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-200">{f.name}</p>
              <p className="text-xs text-slate-500">inquiry #{f.inquiry_id}</p>
            </div>
            <Badge tone="amber">{f.last_touch_hours}h without a touch</Badge>
          </Card>
        ))
      )}
    </div>
  );
}

export function Log({ log }: { log: Board['log'] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="font-semibold">Email log</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Kind</th>
              <th className="px-4 py-2">Recipient</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">State</th>
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
              <tr key={l.id} className="border-t border-slate-800/70">
                <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                  {new Date(l.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-2">
                  <Badge tone={KIND_BADGE[l.kind] ?? 'slate'}>{l.kind}</Badge>
                </td>
                <td className="px-4 py-2 text-slate-400">{l.recipient ?? '—'}</td>
                <td className="max-w-[320px] truncate px-4 py-2">{l.subject}</td>
                <td className="px-4 py-2">
                  {l.dispatched ? <Badge tone="green">Sent</Badge> : <Badge tone="red">Failed</Badge>}
                  {l.note?.startsWith('error:') && <span className="ml-2 text-xs text-red-300">{(l.note ?? '').slice(6)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}