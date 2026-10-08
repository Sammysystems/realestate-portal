import { Badge, Button, Card, Empty } from './ui';
import type { Inspection } from '../types';
import { CalendarCheck } from 'lucide-react';

const STATUS_BADGE: Record<string, 'green' | 'amber' | 'slate' | 'blue'> = {
  pending: 'amber',
  confirmed: 'blue',
  reminded: 'slate',
  done: 'green',
  cancelled: 'slate',
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function Inspections({
  inspections,
  onStatus,
}: {
  inspections: Inspection[];
  onStatus: (id: number, status: string) => void;
}) {
  const today = startOfDay(new Date());
  const tomorrow = today + 86_400_000;

  const groups: { label: string; items: Inspection[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Tomorrow', items: [] },
    { label: 'Later this week', items: [] },
    { label: 'Earlier', items: [] },
  ];
  for (const ins of [...inspections].sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for))) {
    const t = startOfDay(new Date(ins.scheduled_for));
    if (t < today) groups[3].items.push(ins);
    else if (t < tomorrow) groups[0].items.push(ins);
    else if (t < tomorrow + 86_400_000) groups[1].items.push(ins);
    else groups[2].items.push(ins);
  }

  const visible = groups.filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">Scheduled viewings, grouped by day. Mark done straight from the row.</p>

      {visible.length === 0 && (
        <Card>
          <Empty>No inspections yet.</Empty>
        </Card>
      )}

      {visible.map((g) => (
        <section key={g.label}>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{g.label}</h2>
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-faint tabular-nums">{g.items.length}</span>
          </div>
          <div className="space-y-2.5">
            {g.items.map((ins) => {
              const when = new Date(ins.scheduled_for);
              const isToday = g.label === 'Today';
              return (
                <Card key={ins.id} className="flex flex-wrap items-center gap-3">
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border ${
                      isToday ? 'border-forest/25 bg-forest/10 text-forest' : 'border-line bg-linen-warm text-ink-soft'
                    }`}
                  >
                    <CalendarCheck className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">
                      {ins.client_name ?? 'Client'}
                      {ins.agent_name ? <span className="font-normal text-ink-faint"> · {ins.agent_name}</span> : null}
                    </p>
                    <p className="text-sm text-ink-soft tabular-nums">
                      {when.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={STATUS_BADGE[ins.status] ?? 'slate'}>{ins.status}</Badge>
                    {ins.status !== 'done' && (
                      <Button variant="ghost" onClick={() => onStatus(ins.id, 'done')}>
                        Mark done
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
