/* ------------------------------------------------------------------
   Hand-rolled SVG/CSS chart primitives — palette-matched, zero deps.
   Donut · Bars · LatencyGauge · SlaMeter · StatusSplit
------------------------------------------------------------------ */

export const CHART_COLORS = [
  'oklch(28.5% 0.05 145)', // forest
  'oklch(76.2% 0.11 86)', // ochre
  'oklch(48% 0.07 145)', // mid green
  'oklch(66% 0.1 86)', // light ochre
  'oklch(55% 0.03 240)', // slate
  'oklch(58% 0.16 30)', // danger
];

export type Segment = { label: string; value: number; color: string };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* ---------------- Donut ---------------- */
export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 148,
}: {
  segments: Segment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const thickness = size * 0.13;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(96% 0.008 85)" strokeWidth={thickness} />
            {total > 0 &&
              segments.map((s) => {
                const len = (s.value / total) * c;
                const el = (
                  <circle
                    key={s.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${len} ${c - len}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += len;
                return el;
              })}
          </g>
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="font-display text-2xl leading-none font-semibold tabular-nums text-ink">{centerValue}</span>
          <span className="mt-1 text-[10px] font-medium tracking-wide text-ink-faint uppercase">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-32 space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <span className="capitalize text-ink-soft">{s.label}</span>
            <span className="ml-auto font-medium tabular-nums text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Bars ---------------- */
export function Bars({
  data,
  height = 116,
  compact = false,
  accent = 'oklch(76.2% 0.11 86)',
  unit = '',
}: {
  data: { label: string; value: number }[];
  height?: number;
  compact?: boolean;
  accent?: string;
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const labelEvery = compact ? Math.ceil(data.length / 4) : Math.ceil(data.length / 7);

  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => {
          const h = d.value === 0 ? 2 : Math.max(6, (d.value / max) * height);
          return (
            <div
              key={`${d.label}-${i}`}
              title={`${d.label}: ${fmt(d.value)}${unit}`}
              className="group flex flex-1 flex-col items-center justify-end"
              style={{ height }}
            >
              <div
                className="w-full max-w-[26px] rounded-t-[3px] transition-[height,background-color] duration-200"
                style={{
                  height: h,
                  background: d.value === 0 ? 'oklch(96% 0.008 85)' : accent,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px] text-[10px] text-ink-faint">
        {data.map((d, i) => (
          <span key={`${d.label}-lbl-${i}`} className="flex-1 text-center whitespace-nowrap">
            {i % labelEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- First-reply latency gauge ---------------- */
export function LatencyGauge({ hours, target = 4, max = 12 }: { hours: number; target?: number; max?: number }) {
  const frac = Math.max(0.02, Math.min(1, hours / max));
  const L = Math.PI * 80;
  const color =
    hours <= target * 0.5 ? 'oklch(28.5% 0.05 145)' : hours <= target ? 'oklch(76.2% 0.11 86)' : 'oklch(58% 0.16 30)';

  const tickAngle = Math.PI * (1 - Math.min(1, target / max));
  const tx = 100 + 84 * Math.cos(tickAngle);
  const ty = 100 - 84 * Math.sin(tickAngle);
  const innerX = 100 + 70 * Math.cos(tickAngle);
  const innerY = 100 - 70 * Math.sin(tickAngle);

  return (
    <div className="relative">
      <svg width="100%" viewBox="0 0 200 112" role="img" aria-label={`Average first reply ${fmt(hours)} hours`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="oklch(96% 0.008 85)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${frac * L} ${L}`}
        />
        <line x1={innerX} y1={innerY} x2={tx} y2={ty} stroke="oklch(42% 0.012 240)" strokeWidth="1.5" />
        <text x={tx} y={Math.max(10, ty - 5)} textAnchor="middle" fontSize="9" fill="oklch(42% 0.012 240)" fontWeight="600">
          {target}h SLA
        </text>
        <text x="100" y="92" textAnchor="middle" fontSize="30" fontFamily="ui-serif, Georgia, serif" fontWeight="600" fill="oklch(15% 0.01 240)">
          {fmt(hours)}h
        </text>
        <text x="100" y="108" textAnchor="middle" fontSize="9" fill="oklch(60% 0.008 240)" fontWeight="600" letterSpacing="0.06em">
          AVG FIRST REPLY
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Deal SLA meter ---------------- */
export function SlaMeter({ stalled, sla }: { stalled: number; sla: number }) {
  const ratio = sla > 0 ? stalled / sla : 0;
  const pct = Math.min(100, Math.max(3, ratio * 100));
  const color = ratio >= 1 ? 'oklch(58% 0.16 30)' : ratio >= 0.7 ? 'oklch(76.2% 0.11 86)' : 'oklch(28.5% 0.05 145)';

  return (
    <div className="min-w-40 flex-1">
      <div className="flex items-baseline justify-between text-[11px] text-ink-faint">
        <span>
          <span className="font-semibold tabular-nums text-ink-soft">{fmt(stalled)}d</span> since touch
        </span>
        <span className="tabular-nums">SLA {sla}d</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-linen-warm">
        <div
          className="h-full rounded-full transition-[width,background-color] duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ---------------- Stacked status split ---------------- */
export function StatusSplit({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-linen-warm">
        {total === 0 ? null : segments.map((s) => (
          <div
            key={s.label}
            title={`${s.label}: ${s.value}`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[3px]" style={{ background: s.color }} />
            <span className="capitalize">{s.label}</span>
            <span className="font-semibold tabular-nums text-ink">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
