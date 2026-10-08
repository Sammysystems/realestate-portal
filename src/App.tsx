import { useCallback, useEffect, useState } from 'react';
import type { Board, SentEntry } from './types';
import { getToken, loadBoard, patchDeal, patchInspection, patchProperty, runAction, seedDemo, setToken, submitInquiry } from './lib/api';
import { Button, Card } from './components/ui';
import { Dashboard } from './components/Dashboard';
import { Properties } from './components/Properties';
import { Inquiries } from './components/Inquiries';
import { Deals } from './components/Deals';
import { Inspections } from './components/Inspections';
import { Followups, Log } from './components/Followups';

const TABS = ['dashboard', 'properties', 'inquiries', 'land-search', 'inspections', 'follow-ups', 'log'] as const;
type Tab = (typeof TABS)[number];

type Toast = { tone: 'ok' | 'err'; text: string } | null;

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [showIntake, setShowIntake] = useState(false);

  const refresh = useCallback(async () => {
    const b = await loadBoard();
    setBoard(b);
    return b;
  }, []);

  useEffect(() => {
    if (authed) refresh().catch(() => setAuthed(false));
  }, [authed, refresh]);

  const flash = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 5000);
  };

  const onAction = async (type: 'follow-ups' | 'overdue-alerts' | 'reminders') => {
    setBusy(type);
    try {
      const r = await runAction(type);
      await refresh();
      if (r.dispatched === 0) flash({ tone: 'ok', text: `${type}: nothing to send — board is clear.` });
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
      flash({ tone: 'ok', text: `Deal ${d?.client_name ?? id} touched — stall clock reset.` });
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
        text: `Inquiry #${r.inquiry_id} in — auto-reply ${r.reply.sent ? 'sent' : 'staged'}: "${r.reply.subject}"` +
          (r.matched_property ? ` (matched: ${r.matched_property})` : ''),
      });
    } catch (e) {
      flash({ tone: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const onSeed = async () => {
    try {
      await seedDemo();
      await refresh();
      flash({ tone: 'ok', text: 'Demo data seeded. Board reflects a fresh "today".' });
    } catch (e) {
      flash({ tone: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-sm">
          <h1 className="text-lg font-semibold">Real Estate Ops Desk</h1>
          <p className="mt-1 text-sm text-slate-400">Enter the desk token to open the board.</p>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get('token') as string;
              if (v.trim()) {
                setToken(v.trim());
                setAuthed(true);
              }
            }}
          >
            <input
              name="token"
              type="password"
              placeholder="Desk token"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
            <Button type="submit">Open desk</Button>
          </form>
        </Card>
      </div>
    );
  }

  const propertyTitles = Object.fromEntries((board?.properties ?? []).map((p) => [p.id, p.title]));
  const inquiryCounts: Record<string, number> = {};
  for (const i of board?.inquiries ?? []) {
    if (i.property_id) inquiryCounts[i.property_id] = (inquiryCounts[i.property_id] ?? 0) + 1;
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Real Estate Ops Desk</h1>
          <p className="text-sm text-slate-400">One screen: properties, inquiries, land search, inspections, follow-ups.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onSeed} title="Seed demo data (SEED_ENABLED must be true)">
            Seed demo
          </Button>
          <Button onClick={() => setShowIntake(true)}>+ New inquiry</Button>
        </div>
      </header>

      <nav className="mt-4 flex flex-wrap gap-1.5 border-b border-slate-800 pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${
              tab === t ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {toast && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            toast.tone === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {toast.text}
        </div>
      )}

      <main className="mt-5">
        {!board ? (
          <Card>
            <p className="text-sm text-slate-400">Loading the board…</p>
          </Card>
        ) : tab === 'dashboard' ? (
          <Dashboard board={board} running={busy} onAction={onAction} />
        ) : tab === 'properties' ? (
          <Properties
            properties={board.properties}
            inquiryCounts={inquiryCounts}
            onStatus={onPropertyStatus}
          />
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

      {showIntake && <IntakeModal onSubmit={onIntakeSubmit} onClose={() => setShowIntake(false)} properties={board?.properties ?? []} />}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5" >
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold">New inquiry</h2>
          <p className="text-sm text-slate-400">Submitting creates the inquiry, fires the auto first-reply, and logs it. Live.</p>
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
            <input name="name" required placeholder="Name" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500" />
            <input name="phone" required placeholder="Phone" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500" />
            <input name="email" placeholder="Email (for the auto-reply)" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500" />
            <select name="property" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500">
              <option value="">No specific property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.title}>
                  {p.title}
                </option>
              ))}
            </select>
            <textarea
              name="message"
              required
              rows={3}
              placeholder="What are you looking for?"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Submit inquiry'}
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}