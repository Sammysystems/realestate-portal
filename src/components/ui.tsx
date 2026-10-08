import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'red' | 'amber' | 'green' | 'slate' | 'blue'; children: ReactNode }) {
  const tones: Record<string, string> = {
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  title,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: 'bg-sky-600 hover:bg-sky-500 text-white',
    ghost: 'bg-slate-800 hover:bg-slate-700 text-slate-200',
    danger: 'bg-red-600/80 hover:bg-red-500 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  };
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Stat({ label, value, tone = 'slate' }: { label: string; value: ReactNode; tone?: 'red' | 'amber' | 'green' | 'slate' }) {
  const tones: Record<string, string> = {
    red: 'text-red-300',
    amber: 'text-amber-300',
    green: 'text-emerald-300',
    slate: 'text-slate-100',
  };
  return (
    <Card>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${tones[tone]}`}>{value}</p>
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}