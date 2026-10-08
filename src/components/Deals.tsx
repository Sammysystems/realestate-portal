import { Avatar, Badge, Button, Card, Empty } from './ui';
import { CHART_COLORS, Donut, SlaMeter, type Segment } from './charts';
import type { Deal } from '../types';
import { FileText } from 'lucide-react';

const STAGES = ['new', 'search', 'docs', 'consent', 'exchange'];

export function Deals({ deals, onTouch }: { deals: Deal[]; onTouch: (id: string, stage: string) => void }) {
  const segments: Segment[] = STAGES.map((s, i) => ({
    label: s,
    value: deals.filter((d) => d.search_stage === s).length,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((s) => s.value > 0);

  const overdue = deals.filter((d) => d.overdue).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-card px-4 py-3.5 shadow-hair">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Stage distribution</h2>
          <span className="text-xs text-ink-faint tabular-nums">
            {overdue} overdue · {deals.length} live
          </span>
        </div>
        {segments.length === 0 ? (
          <Empty>No deals yet.</Empty>
        ) : (
          <Donut segments={segments} centerValue={String(deals.length)} centerLabel="deals" size={128} />
        )}
      </div>

      {deals.map((d) => {
        const stageIdx = STAGES.indexOf(d.search_stage);
        return (
          <Card key={d.id} className={d.overdue ? 'border-danger/35' : ''}>
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={d.client_name ?? d.id} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{d.client_name ?? d.id}</span>
                  {d.overdue ? (
                    <Badge tone="red">Overdue by {Math.round(d.overdue_by_days)}d</Badge>
                  ) : (
                    <Badge tone="green">On track</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {d.agent_name ? `agent: ${d.agent_name} · ` : ''}last update {Math.floor(d.stalled_days)}d ago
                </p>
              </div>
              <Button variant="ghost" onClick={() => onTouch(d.id, d.search_stage)}>
                Touch
              </Button>
            </div>

            {/* stage stepper */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STAGES.map((s, i) => {
                const active = s === d.search_stage;
                const past = i < stageIdx;
                return (
                  <button
                    key={s}
                    onClick={() => onTouch(d.id, s)}
                    aria-label={`Move to ${s.replace('_', ' ')}`}
                    aria-current={active}
                    className={`press rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                      active
                        ? 'border-forest bg-forest text-linen shadow-hair'
                        : past
                          ? 'border-forest/30 bg-forest/10 text-forest hover:border-forest/50'
                          : 'border-line bg-card text-ink-faint hover:border-ink-faint hover:text-ink-soft'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-4">
              <SlaMeter stalled={d.stalled_days} sla={d.sla_days} />
              {d.docs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                  <FileText className="h-3.5 w-3.5 text-ink-faint" />
                  {(d.docs as string[]).map((doc) => (
                    <span key={doc} className="rounded-full border border-line bg-linen-warm px-2 py-0.5">
                      {doc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
