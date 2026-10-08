import { Card, Empty } from './ui';
import type { Property } from '../types';

const daysOn = (created_at: string) => Math.max(1, Math.round((Date.now() - new Date(created_at).getTime()) / 86_400_000));

export function Properties({
  properties,
  inquiryCounts,
  onStatus,
}: {
  properties: Property[];
  inquiryCounts: Record<string, number>;
  onStatus: (id: string, status: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="font-semibold">Properties</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Days on market</th>
              <th className="px-4 py-2">Inquiries</th>
              <th className="px-4 py-2">Agent</th>
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
              <tr key={p.id} className="border-t border-slate-800/70">
                <td className="px-4 py-2">
                  <p className="font-medium text-slate-200">{p.title}</p>
                  {p.address && <p className="text-xs text-slate-500">{p.address}</p>}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{p.price_label ?? '—'}</td>
                <td className="px-4 py-2">
                  <select
                    value={p.status}
                    onChange={(e) => onStatus(p.id, e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  >
                    {['for_sale', 'under_offer', 'let', 'sold'].map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">{daysOn(p.created_at)}d</td>
                <td className="px-4 py-2">{inquiryCounts[p.id] ?? 0}</td>
                <td className="px-4 py-2 text-slate-400">{p.agent_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}