import { Badge, Button, Card, Empty } from './ui';
import type { Inspection } from '../types';

const STATUS_BADGE: Record<string, 'green' | 'amber' | 'slate' | 'blue'> = {
  pending: 'amber',
  confirmed: 'blue',
  reminded: 'slate',
  done: 'green',
  cancelled: 'slate',
};

export function Inspections({
  inspections,
  onStatus,
}: {
  inspections: Inspection[];
  onStatus: (id: number, status: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Inspections</h2>
      {inspections.length === 0 && (
        <Card>
          <Empty>No inspections yet.</Empty>
        </Card>
      )}
      {inspections.map((ins) => (
        <Card key={ins.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-slate-200">{(ins.client_name ?? 'Client') + (ins.agent_name ? ` · ${ins.agent_name}` : '')}</p>
            <p className="text-sm text-slate-400">
              {new Date(ins.scheduled_for).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_BADGE[ins.status] ?? 'slate'}>{ins.status}</Badge>
            {ins.status !== 'done' && (
              <Button variant="ghost" onClick={() => onStatus(ins.id, 'done')}>
                Mark done
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}