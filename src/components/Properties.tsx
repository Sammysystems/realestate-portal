import { Avatar, Empty, Select, TableShell, TD_CLS, TH_CLS, TR_CLS } from './ui';
import { CHART_COLORS, StatusSplit, type Segment } from './charts';
import type { Property } from '../types';

const daysOn = (created_at: string) => Math.max(1, Math.round((Date.now() - new Date(created_at).getTime()) / 86_400_000));

const STATUS_COLOR: Record<string, string> = {
  for_sale: CHART_COLORS[0],
  under_offer: CHART_COLORS[1],
  let: CHART_COLORS[4],
  sold: CHART_COLORS[2],
};

export function Properties({
  properties,
  inquiryCounts,
  onStatus,
}: {
  properties: Property[];
  inquiryCounts: Record<string, number>;
  onStatus: (id: string, status: string) => void;
}) {
  const statuses = ['for_sale', 'under_offer', 'let', 'sold'];
  const segments: Segment[] = statuses.map((s) => ({
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

      <TableShell title="All properties">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-linen-warm/50">
              <th className={TH_CLS}>Property</th>
              <th className={TH_CLS}>Price</th>
              <th className={TH_CLS}>Status</th>
              <th className={TH_CLS}>Days on market</th>
              <th className={TH_CLS}>Inquiries</th>
              <th className={TH_CLS}>Agent</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6">
                  <Empty>No properties yet.</Empty>
                </td>
              </tr>
            )}
            {properties.map((p) => (
              <tr key={p.id} className={TR_CLS}>
                <td className={TD_CLS}>
                  <p className="font-medium text-ink">{p.title}</p>
                  {p.address && <p className="text-xs text-ink-faint">{p.address}</p>}
                </td>
                <td className={`${TD_CLS} font-medium whitespace-nowrap tabular-nums`}>{p.price_label ?? '—'}</td>
                <td className={TD_CLS}>
                  <Select
                    value={p.status}
                    onChange={(v) => onStatus(p.id, v)}
                    options={statuses}
                    ariaLabel={`Status for ${p.title}`}
                    className="text-xs"
                  />
                </td>
                <td className={`${TD_CLS} tabular-nums`}>{daysOn(p.created_at)}d</td>
                <td className={TD_CLS}>
                  <span
                    className={`inline-block min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${
                      (inquiryCounts[p.id] ?? 0) > 0 ? 'bg-forest/10 text-forest' : 'text-ink-faint'
                    }`}
                  >
                    {inquiryCounts[p.id] ?? 0}
                  </span>
                </td>
                <td className={TD_CLS}>
                  {p.agent_name ? (
                    <span className="flex items-center gap-2 text-ink-soft">
                      <Avatar name={p.agent_name} size={24} />
                      {p.agent_name}
                    </span>
                  ) : (
                    <span className="text-ink-faint">—</span>
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
