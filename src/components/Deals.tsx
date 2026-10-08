import { Badge, Button, Card, Empty } from './ui';
import type { Deal } from '../types';

const STAGES = ['new', 'search', 'docs', 'consent', 'exchange'];

export function Deals({ deals, onTouch }: { deals: Deal[]; onTouch: (id: string, stage: string) => void }) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Land search &amp; documents</h2>
      {deals.length === 0 && (
        <Card>
          <Empty>No deals yet.</Empty>
        </Card>
      )}
      {deals.map((d) => (
        <Card key={d.id} className={d.overdue ? 'border-red-500/40' : ''}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-200">{d.client_name ?? d.id}</span>
                {d.overdue ? (
                  <Badge tone="red">Overdue by {Math.round(d.overdue_by_days)}d</Badge>
                ) : (
                  <Badge tone="green">On track</Badge>
                )}
                <span className="text-xs text-slate-500">
                  {d.agent_name ? `agent: ${d.agent_name}` : ''} · last update {Math.floor(d.stalled_days)}d ago (SLA {d.sla_days}d)
                </span>
              </div>
              {d.docs.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  docs: {(d.docs as string[]).join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={d.search_stage}
                onChange={(e) => onTouch(d.id, e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Button variant="ghost" onClick={() => onTouch(d.id, d.search_stage)}>
                Touch
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}