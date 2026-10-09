import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Board } from './types';
import { getToken, loadBoard, patchDeal, patchInspection, patchProperty, runAction, setToken, submitInquiry } from './lib/api';
import { Button, Card, Toast, inputCls } from './components/ui';
import { AskDeskVoice } from './components/AskDeskVoice';
import { Dashboard } from './components/Dashboard';
import { Properties } from './components/Properties';
import { Inquiries } from './components/Inquiries';
import { Deals } from './components/Deals';
import { Inspections } from './components/Inspections';
import { Followups, Log } from './components/Followups';
import {
  Building2,
  CalendarCheck,
  Inbox,
  LandPlot,
  LayoutDashboard,
  ListChecks,
  Menu,
  Plus,
  ScrollText,
  X,
} from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, title: 'Today\u2019s board', sub: 'Properties, inquiries, land search, inspections, follow-ups \u2014 one screen.' },
  { id: 'properties', label: 'Properties', icon: Building2, title: 'Properties', sub: 'Portfolio, prices, days on market.' },
  { id: 'inquiries', label: 'Inquiries', icon: Inbox, title: 'Inquiries', sub: 'Every conversation, with reply latency.' },
  { id: 'land-search', label: 'Land search', icon: LandPlot, title: 'Land search & documents', sub: 'Stage, stall clock and SLA per deal.' },
  { id: 'inspections', label: 'Inspections', icon: CalendarCheck, title: 'Inspections', sub: 'Today, tomorrow and beyond.' },
  { id: 'follow-ups', label: 'Follow-ups', icon: ListChecks, title: 'Follow-up center', sub: 'Open inquiries untouched for 24h+.' },
  { id: 'log', label: 'Email log', icon: ScrollText, title: 'Email log', sub: 'Every dispatch \u2014 sent or failed.' },
] as const;
type Tab = (typeof NAV)[number]['id'];

type ToastState = { tone: 'ok' | 'err'; text: string } | null;

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [showIntake, setShowIntake] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const refresh = useCallback(async () => {
    const b = await loadBoard();
    setBoard(b);
    return b;
  }, []);

  useEffect(() => {
    if (authed) refresh().catch(() => setAuthed(false));
  }, [authed, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawer(false);
        setShowIntake(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const flash = (t: ToastState) => {
    setToast(t);
    setTimeout(() => setToast(null), 5000);
  };

  const onAction = async (type: 'follow-ups' | 'overdue-alerts' | 'reminders') => {
    setBusy(type);
    try {
      const r = await runAction(type);
      await refresh();
      if (r.dispatched === 0) flash({ tone: 'ok', text: `${type}: nothing to send \u2014 board is clear.` });
      else flash({ tone: 'ok', text: `${type}: ${r.dispatched} email${r.dispatched === 1 ? '' : 's'} dispatched and logged.` });
    } catch (e) {
      flash({ tone: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const onDealTouch = async (id: string, stage: string) => {
    try {
      await patchDeal(id, { search_stage: stage });
      const b = await refresh();
      const d = b.deals.find((x) => x.id === id);
      flash({ tone: 'ok', text: `Deal ${d?.client_name ?? id} touched \u2014 stall clock reset.` });
    } catch (e) {
      flash({ tone: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const onInspectionStatus = async (id: number, status: string) => {
    try {
      await patchInspection(id, { status });
      await refresh();
      flash({ tone: 'ok', text: `Inspection #${id} marked ${status}.` });
    } catch (e) {
      flash({ tone: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const onPropertyStatus = async (id: string, status: string) => {
    try {
      await patchProperty(id, { status });
      await refresh();
      flash({ tone: 'ok', text: 'Property status updated.' });
    } catch (e) {
      flash({ tone: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const onIntakeSubmit = async (payload: { name: string; phone: string; email?: string; message: string }) => {
    try {
      const r = await submitInquiry(payload);
      await refresh();
      setShowIntake(false);
      flash({
        tone: 'ok',
        text: `Inquiry from ${payload.name} in \u2014 auto-reply ${r.reply.sent ? 'sent' : 'staged'}: "${r.reply.subject}"` +
          (r.matched_property ? ` (matched: ${r.matched_property})` : ''),
      });
    } catch (e) {
      flash({ tone: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  };

  if (!authed) return <Login onOpen={(t) => { setToken(t); setAuthed(true); }} />;

  const current = NAV.find((n) => n.id === tab) ?? NAV[0];
  const counts: Partial<Record<Tab, number>> = {
    inquiries: board?.stats.open_inquiries ?? 0,
    'land-search': board?.stats.overdue_deals ?? 0,
    inspections: board?.stats.inspections_today ?? 0,
  };

  const propertyTitles = Object.fromEntries((board?.properties ?? []).map((p) => [p.id, p.title]));
  const inquiryCounts: Record<string, number> = {};
  for (const i of board?.inquiries ?? []) {
    if (i.property_id) inquiryCounts[i.property_id] = (inquiryCounts[i.property_id] ?? 0) + 1;
  }

  const navItems = (
    <nav className="flex-1 space-y-1 px-3">
      {NAV.map((n) => {
        const active = tab === n.id;
        const count = counts[n.id] ?? 0;
        return (
          <button
            key={n.id}
            onClick={() => {
              setTab(n.id);
              setDrawer(false);
            }}
            className={`press flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              active ? 'bg-linen text-forest shadow-hair' : 'text-linen/75 hover:bg-white/10 hover:text-linen'
            }`}
          >
            <n.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{n.label}</span>
            {count > 0 && (
              <span
                className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  active ? 'bg-ochre text-ink' : 'bg-white/15 text-linen'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const sidebarBody = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ochre font-display text-lg font-semibold text-ink">
          R
        </span>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold text-linen">Real Estate</p>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-linen/55 uppercase">Ops Desk</p>
        </div>
        <button
          onClick={() => setDrawer(false)}
          aria-label="Close menu"
          className="press ml-auto rounded-md p-1 text-linen/70 hover:bg-white/10 hover:text-linen lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {navItems}
      <div className="border-t border-white/10 px-4 py-4 text-[11px] leading-relaxed text-linen/55">
        <p className="font-medium text-linen/80">Akwa Ibom &middot; Uyo</p>
        <p>Property desk &mdash; live board.</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-linen text-ink">
      {/* forest rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-forest transition-transform duration-200 ease-premium lg:translate-x-0 ${
          drawer ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarBody}
      </aside>
      {drawer && (
        <div
          className="anim-fade fixed inset-0 z-30 bg-ink/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setDrawer(false)}
          aria-hidden
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-linen/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="press rounded-lg border border-line bg-card p-2 text-ink lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg leading-tight font-semibold sm:text-xl">{current.title}</h1>
              <p className="hidden truncate text-xs text-ink-faint sm:block">{current.sub}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button onClick={() => setShowIntake(true)}>
                <Plus className="h-4 w-4" />
                New inquiry
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {!board ? (
            <Card>
              <p className="text-sm text-ink-soft">Loading the board&hellip;</p>
            </Card>
          ) : tab === 'dashboard' ? (
            <Dashboard board={board} running={busy} onAction={onAction} />
          ) : tab === 'properties' ? (
            <Properties properties={board.properties} inquiryCounts={inquiryCounts} onStatus={onPropertyStatus} />
          ) : tab === 'inquiries' ? (
            <Inquiries inquiries={board.inquiries} propertyTitles={propertyTitles} />
          ) : tab === 'land-search' ? (
            <Deals deals={board.deals} onTouch={onDealTouch} />
          ) : tab === 'inspections' ? (
            <Inspections inspections={board.inspections} onStatus={onInspectionStatus} />
          ) : tab === 'follow-ups' ? (
            <Followups board={board} />
          ) : (
            <Log log={board.log} />
          )}
        </main>
      </div>

      {toast && <Toast tone={toast.tone} text={toast.text} onClose={() => setToast(null)} />}
      <AskDeskVoice />
      {showIntake && <IntakeModal onSubmit={onIntakeSubmit} onClose={() => setShowIntake(false)} properties={board?.properties ?? []} />}
    </div>
  );
}

function Login({ onOpen }: { onOpen: (token: string) => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-linen px-4">
      <div className="anim-pop w-full max-w-sm rounded-lg border border-line bg-card p-6 shadow-pop">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ochre font-display text-lg font-semibold text-ink">R</span>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">Real Estate</p>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-ink-faint uppercase">Ops Desk</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink-soft">Enter the desk token to open the board.</p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const v = new FormData(e.currentTarget).get('token') as string;
            if (v.trim()) onOpen(v.trim());
          }}
        >
          <label className="text-xs font-medium text-ink-soft" htmlFor="desk-token">
            Desk token
          </label>
          <input id="desk-token" name="token" type="password" placeholder="••••••••" className={inputCls} />
          <Button type="submit">Open desk</Button>
        </form>
      </div>
    </div>
  );
}

function IntakeModal({
  onSubmit,
  onClose,
  properties,
}: {
  onSubmit: (p: { name: string; phone: string; email?: string; message: string }) => void;
  onClose: () => void;
  properties: { id: string; title: string }[];
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="anim-fade fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="anim-pop w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="New inquiry">
        <Card className="p-5 shadow-pop">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">New inquiry</h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                Submitting creates the inquiry, fires the auto first-reply, and logs it. Live.
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" className="press rounded-md p-1 text-ink-faint hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              await onSubmit({
                name: String(f.get('name') ?? ''),
                phone: String(f.get('phone') ?? ''),
                email: String(f.get('email') ?? ''),
                message: String(f.get('message') ?? ''),
              });
              setBusy(false);
            }}
          >
            <Field label="Name">
              <input name="name" required placeholder="Amara Okonkwo" className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <input name="phone" required placeholder="+234&hellip;" className={inputCls} />
              </Field>
              <Field label="Email (for the auto-reply)">
                <input name="email" placeholder="amara@example.com" className={inputCls} />
              </Field>
            </div>
            <Field label="Property">
              <select name="property" className={`${inputCls} cursor-pointer`}>
                <option value="">No specific property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.title}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="What are they looking for?">
              <textarea name="message" required rows={3} placeholder="3-bed in Lekki, budget ₦80m…" className={`${inputCls} resize-none`} />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Submit inquiry
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
