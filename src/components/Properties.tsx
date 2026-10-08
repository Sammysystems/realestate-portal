import { Building2, MapPin } from 'lucide-react';
import { Avatar, Badge, Empty, Select } from './ui';
import { CHART_COLORS, StatusSplit, type Segment } from './charts';
import type { Property } from '../types';

const daysOn = (created_at: string) => Math.max(1, Math.round((Date.now() - new Date(created_at).getTime()) / 86_400_000));

const STATUS_COLOR: Record<string, string> = {
  for_sale: CHART_COLORS[0],
  under_offer: CHART_COLORS[1],
  let: CHART_COLORS[4],
  sold: CHART_COLORS[2],
};

const STATUS_TONE: Record<string, 'green' | 'amber' | 'blue' | 'slate'> = {
  for_sale: 'green',
  under_offer: 'amber',
  let: 'blue',
  sold: 'slate',
};

const STATUSES = ['for_sale', 'under_offer', 'let', 'sold'];

export function Properties({
  properties,
  inquiryCounts,
  onStatus,
}: {
  properties: Property[];
  inquiryCounts: Record<string, number>;
  onStatus: (id: string, status: string) => void;
}) {
  const segments: Segment[] = STATUSES.map((s) => ({
    label: s.replace('_', ' '),
    value: properties.filter((p) => p.status === s).length,
    color: STATUS_COLOR[s],
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-card px-4 py-3.5 shadow-hair">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Portfolio mix</h2>
          <span className="text-xs text-ink-faint tabular-nums">{properties.length} properties</span>
        </div>
        <StatusSplit segments={segments} />
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">All properties</h2>
        <span className="text-xs text-ink-faint">{STATUSES.length} statuses tracked</span>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-lg border border-line bg-card px-4 py-6 shadow-hair">
          <Empty>No properties yet.</Empty>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => {
            const inq = inquiryCounts[p.id] ?? 0;
            return (
              <article
                key={p.id}
                className="overflow-hidden rounded-lg border border-line bg-card shadow-hair transition-shadow duration-150 hover:shadow-pop"
              >
                <div className="relative aspect-[16/10] bg-linen-warm">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-ink-faint/60" aria-hidden />
                  </div>
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute top-2.5 left-2.5">
                    <Badge tone={STATUS_TONE[p.status] ?? 'slate'}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-ink-soft backdrop-blur">
                    {p.category}
                  </span>
                </div>

                <div className="space-y-2.5 p-3.5">
                  <div>
                    <p className="text-sm font-semibold leading-snug text-ink">{p.title}</p>
                    {p.address && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-ink-faint">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{p.address}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium tabular-nums text-ink">{p.price_label ?? '—'}</span>
                    <span className="flex items-center gap-1.5">
                      {inq > 0 && (
                        <span
                          title={`${inq} ${inq === 1 ? 'inquiry' : 'inquiries'}`}
                          className="rounded-full bg-forest/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-forest"
                        >
                          {inq}
                        </span>
                      )}
                      <span className="text-xs tabular-nums text-ink-faint">{daysOn(p.created_at)}d</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {p.agent_name ? (
                        <>
                          <Avatar name={p.agent_name} size={22} />
                          <span className="truncate text-xs text-ink-soft">{p.agent_name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-ink-faint">Unassigned</span>
                      )}
                    </div>
                    <Select
                      value={p.status}
                      onChange={(v) => onStatus(p.id, v)}
                      options={STATUSES}
                      ariaLabel={`Status for ${p.title}`}
                      className="text-xs"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
