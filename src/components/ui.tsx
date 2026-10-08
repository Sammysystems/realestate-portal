import type { ReactNode } from 'react';
import { ChevronDown, CircleAlert, CircleCheck, X } from 'lucide-react';

/* ------------------------------------------------------------------
   Shared surface vocabulary — white card, hairline border, 14px
   radius, layered shadow. Every interactive element carries the
   .press class so it compresses on :active.
------------------------------------------------------------------ */

export const inputCls =
  'w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint ' +
  'outline-none transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-forest-mid focus:shadow-[0_0_0_3px_oklch(36%_0.055_145/0.15)]';

export const selectCls =
  'appearance-none rounded-lg border border-line bg-card py-1.5 pl-3 pr-8 text-sm text-ink ' +
  'outline-none transition-colors duration-150 hover:border-ink-faint focus:border-forest-mid cursor-pointer';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-card p-4 shadow-hair ${className}`}>{children}</div>;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  title,
  loading = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'ochre';
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
  loading?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: 'bg-forest text-linen border border-forest hover:bg-forest-mid hover:border-forest-mid shadow-hair',
    ghost: 'bg-transparent text-ink border border-line hover:bg-card hover:border-ink-faint',
    danger: 'bg-danger text-white border border-danger hover:brightness-110 shadow-hair',
    success: 'bg-forest-mid text-linen border border-forest-mid hover:bg-forest hover:border-forest shadow-hair',
    ochre: 'bg-ochre text-ink border border-ochre hover:brightness-105 shadow-hair',
  };
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled || loading}
      title={title}
      className={`press inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium
        disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
      )}
      {children}
    </button>
  );
}

/* Status pill — dot + label, tinted by semantic ink color */
const PILL_TONES = {
  red: 'border-danger/25 bg-danger/10 text-danger-ink',
  amber: 'border-ochre/40 bg-ochre/15 text-ochre-ink',
  green: 'border-forest/25 bg-forest/10 text-forest',
  blue: 'border-info-ink/25 bg-info-ink/10 text-info-ink',
  slate: 'border-line bg-linen-warm text-ink-soft',
} as const;
export type PillTone = keyof typeof PILL_TONES;

const PILL_DOT: Record<PillTone, string> = {
  red: 'bg-danger',
  amber: 'bg-ochre',
  green: 'bg-forest-mid',
  blue: 'bg-info-ink',
  slate: 'bg-ink-faint',
};

export function Badge({ tone, children }: { tone: 'red' | 'amber' | 'green' | 'slate' | 'blue'; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${PILL_TONES[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${PILL_DOT[tone]}`} />
      {children}
    </span>
  );
}

/* Compact metric chip — dense label, serif numeral */
export function Stat({
  label,
  value,
  tone = 'ink',
}: {
  label: string;
  value: ReactNode;
  tone?: 'red' | 'amber' | 'green' | 'ink';
}) {
  const tones: Record<string, string> = {
    red: 'text-danger-ink',
    amber: 'text-ochre-ink',
    green: 'text-forest',
    ink: 'text-ink',
  };
  return (
    <div className="rounded-lg border border-line bg-card px-3.5 py-3 shadow-hair">
      <p className="text-[11px] leading-tight font-medium text-ink-faint">{label}</p>
      <p className={`font-display text-2xl leading-tight font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink-faint">{children}</p>;
}

/* Initials avatar — deterministic tint from the name */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  const tones = ['bg-forest/12 text-forest', 'bg-ochre/25 text-ochre-ink', 'bg-forest-mid/15 text-forest-mid'];
  const tone = tones[(name.charCodeAt(0) + name.length) % tones.length];
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`grid shrink-0 place-items-center rounded-full font-semibold select-none ${tone}`}
    >
      {initials || '?'}
    </span>
  );
}

/* Native select dressed in the shared control vocabulary */
export function Select({
  value,
  onChange,
  options,
  className = '',
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={selectCls}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
    </span>
  );
}

/* Table shell — hairline rows, quiet uppercase head */
export function TableShell({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card shadow-hair">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export const TH_CLS = 'px-4 py-2.5 text-left text-[11px] font-semibold tracking-wide text-ink-faint uppercase';
export const TD_CLS = 'px-4 py-2.5 align-middle text-sm text-ink';
export const TR_CLS = 'border-t border-line transition-colors duration-150 hover:bg-linen-warm/60';

/* Toast — slides up from the bottom-right, backdrop blur */
export function Toast({ tone, text, onClose }: { tone: 'ok' | 'err'; text: string; onClose: () => void }) {
  const ok = tone === 'ok';
  return (
    <div
      role="status"
      className={`anim-rise fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm shadow-pop backdrop-blur-md ${
        ok ? 'border-forest/30 bg-linen/95 text-ink' : 'border-danger/35 bg-danger/10 text-danger-ink'
      }`}
    >
      {ok ? (
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
      ) : (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      )}
      <span className="leading-snug">{text}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="press ml-1 rounded p-0.5 text-ink-faint hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
