import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Loader2, Mail, MessageCircle, Mic, Send, Square, Volume2, VolumeX, X } from 'lucide-react';
import { DeskTalk, type VoiceUI } from '../lib/voice';
import { BrowserMic, detectMicEngine, MicRecorder, type MicEngine } from '../lib/mic';
import { sendDraft, type EmailDraft } from '../lib/api';

const P = {
  bg: '#F7F4EE',
  surface: '#EEE8DD',
  white: '#FFFFFF',
  ink: '#171716',
  sub: '#625F58',
  gold: '#B18A4A',
  goldDark: '#94723B',
  olive: '#65715D',
  line: '#DED7CA',
  link: '#2B67A4',
  danger: '#A3422B',
};

const STATUS: Record<VoiceUI['phase'], string> = {
  off: 'Type a question below — the desk answers aloud',
  idle: 'Ready — ask me anything',
  thinking: 'Checking the live board…',
  speaking: 'Speaking — tap Stop to cut it off',
  error: 'Something went wrong',
};

const INITIAL: VoiceUI = {
  powered: false,
  phase: 'off',
  heard: '',
  answer: '',
  used: '',
  turns: [],
  muted: false,
  error: null,
};

const GREETING = 'Welcome to the Real Estate Ops Desk. How may I help you?';

type MicState = 'idle' | 'recording' | 'transcribing';

type Msg = { who: 'you' | 'desk'; text: string; email?: EmailDraft | null; pending?: boolean; live?: boolean };

export function AskDeskVoice() {
  const [ui, setUi] = useState<VoiceUI>(INITIAL);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [engine, setEngine] = useState<MicEngine>('none');
  const [micState, setMicState] = useState<MicState>('idle');
  const [micNote, setMicNote] = useState('');
  const [reveal, setReveal] = useState(Infinity);
  const [emailState, setEmailState] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
  const talk = useRef<DeskTalk | null>(null);
  const rec = useRef<MicRecorder | null>(null);
  const bmic = useRef<BrowserMic | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = new DeskTalk(setUi);
    talk.current = t;
    void detectMicEngine().then(setEngine);
    return () => t.destroy();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [ui.turns, ui.phase, ui.heard]);

  // While the desk speaks, reveal the written answer word by word so it reads as
  // "saying it as it writes".
  useEffect(() => {
    if (ui.phase !== 'speaking' || !ui.answer) {
      setReveal(Infinity);
      return;
    }
    const words = ui.answer.split(/\s+/).length;
    setReveal(0);
    const iv = window.setInterval(() => setReveal((r) => Math.min(words, r + 1)), 210);
    return () => window.clearInterval(iv);
  }, [ui.phase, ui.answer]);

  const openPanel = useCallback(() => {
    setOpen(true);
    const t = talk.current;
    if (t && !t.powered) void t.power();
  }, []);

  const flash = (msg: string) => {
    setMicNote(msg);
    window.setTimeout(() => setMicNote(''), 3200);
  };

  const startRecord = async () => {
    setMicNote('');
    try {
      const r = new MicRecorder();
      rec.current = r;
      await r.start();
      setMicState('recording');
    } catch {
      setMicState('idle');
      flash('Microphone unavailable — check permission.');
    }
  };

  const stopRecord = async () => {
    const r = rec.current;
    if (!r) return;
    setMicState('transcribing');
    try {
      const text = await r.stop();
      if (text) {
        talk.current?.ask(text);
        setQ('');
      } else {
        flash('Did not catch that — try again.');
      }
    } catch {
      flash('Voice note failed — type instead.');
    }
    setMicState('idle');
  };

  const toggleMic = () => {
    if (micState !== 'idle') {
      if (engine === 'whisper') void stopRecord();
      else bmic.current?.stop();
      return;
    }
    if (engine === 'whisper') {
      void startRecord();
      return;
    }
    const b = new BrowserMic();
    bmic.current = b;
    setMicState('recording');
    const ok = b.start(
      (text) => setQ(text),
      () => {
        setMicState('idle');
        const t = b.finalText();
        if (t) {
          talk.current?.ask(t);
          setQ('');
        } else {
          setQ('');
        }
      },
    );
    if (!ok) {
      setMicState('idle');
      flash('This browser cannot take voice notes.');
    }
  };

  const sendEmail = async (d: EmailDraft) => {
    const key = `${d.to}|${d.subject}`;
    setEmailState((s) => ({ ...s, [key]: 'sending' }));
    try {
      await sendDraft(d);
      setEmailState((s) => ({ ...s, [key]: 'sent' }));
    } catch {
      setEmailState((s) => ({ ...s, [key]: 'error' }));
    }
  };

  const messages: Msg[] = [];
  if (ui.turns.length) {
    for (const t of [...ui.turns].reverse()) {
      if (t.q) messages.push({ who: 'you', text: t.q });
      messages.push({ who: 'desk', text: t.a, email: t.email });
    }
  } else {
    messages.push({ who: 'desk', text: GREETING });
  }
  if (ui.phase === 'thinking') {
    messages.push({ who: 'you', text: ui.heard });
    messages.push({ who: 'desk', text: '', pending: true });
  }
  if (ui.phase === 'error' && ui.error) messages.push({ who: 'desk', text: ui.error });

  if (ui.phase === 'speaking' && ui.answer) {
    const last = messages.filter((m) => m.who === 'desk').length - 1;
    let seen = 0;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].who !== 'desk') continue;
      if (seen === last && messages[i].text === ui.answer) messages[i] = { ...messages[i], live: true };
      seen++;
    }
  }

  const busy = ui.phase === 'thinking';
  const micActive = micState !== 'idle';

  return (
    <>
      {open && (
        <section
          className="desk-rise"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 96,
            zIndex: 60,
            width: 'min(390px, calc(100vw - 40px))',
            background: P.bg,
            color: P.ink,
            border: `1px solid ${P.line}`,
            borderRadius: 18,
            boxShadow: '0 24px 60px rgba(23,23,22,0.22)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(70vh, 620px)',
          }}
          aria-live="polite"
        >
          {/* header */}
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              background: P.white,
              borderBottom: `1px solid ${P.line}`,
            }}
          >
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 30,
                height: 30,
                borderRadius: 999,
                background: P.gold,
                color: P.white,
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              D
            </span>
            <div style={{ lineHeight: 1.15 }}>
              <p style={{ margin: 0, fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 19, fontWeight: 600 }}>
                Ask the Desk
              </p>
              <p style={{ margin: 0, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.sub }}>
                Type or speak — it answers aloud
              </p>
            </div>
            <button
              onClick={() => {
                talk.current?.powerOff();
                setOpen(false);
              }}
              aria-label="Close"
              className="press"
              style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: P.sub, cursor: 'pointer', padding: 6 }}
            >
              <X size={16} />
            </button>
          </header>

          {/* messages */}
          <div style={{ flex: 1, minHeight: 200, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) =>
              m.pending ? (
                <div key={i} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '9px 12px',
                      background: P.white,
                      border: `1px solid ${P.line}`,
                      borderRadius: 12,
                    }}
                  >
                    {[0, 1, 2].map((k) => (
                      <span key={k} className="desk-bounce" style={{ width: 5, height: 5, borderRadius: 999, background: P.olive, animationDelay: `${k * 130}ms` }} />
                    ))}
                  </div>
                </div>
              ) : (
                <div key={i} style={{ display: 'flex', justifyContent: m.who === 'you' ? 'flex-end' : 'flex-start' }}>
                  <div
                    style={{
                      maxWidth: '86%',
                      padding: '8px 12px',
                      borderRadius: 12,
                      borderTopRightRadius: m.who === 'you' ? 3 : 12,
                      borderTopLeftRadius: m.who === 'you' ? 12 : 3,
                      background: m.who === 'you' ? P.gold : P.white,
                      color: m.who === 'you' ? P.white : P.ink,
                      border: m.who === 'you' ? 'none' : `1px solid ${P.line}`,
                      boxShadow: '0 1px 3px rgba(23,23,22,0.06)',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {m.live ? `${m.text.split(/\s+/).slice(0, reveal).join(' ') || '▍'}` + (reveal < m.text.split(/\s+/).length ? ' ▍' : '') : m.text}
                    </p>
                    {m.who === 'desk' && m.email && (
                      <EmailButton draft={m.email} state={emailState[`${m.email.to}|${m.email.subject}`] ?? 'idle'} onSend={() => void sendEmail(m.email!)} />
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>

          {/* status + controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 10px' }}>
            <span style={{ fontSize: 11, color: P.sub, display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              {ui.phase === 'thinking' ? (
                <>
                  <Loader2 size={12} className="desk-spin" style={{ color: P.olive }} />
                  {STATUS.thinking}
                </>
              ) : ui.phase === 'speaking' ? (
                <>
                  <span className="desk-pulse" style={{ width: 7, height: 7, borderRadius: 999, background: P.goldDark }} />
                  {STATUS.speaking}
                </>
              ) : (
                STATUS[ui.phase]
              )}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={() => talk.current?.toggleMute()} className="press" aria-label={ui.muted ? 'Unmute' : 'Mute'} style={ctrl(ui.muted || false)}>
                {ui.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              {(ui.phase === 'speaking' || ui.phase === 'thinking') && (
                <button onClick={() => talk.current?.interrupt()} className="press" style={ctrl(false)}>
                  <Square size={11} />
                </button>
              )}
            </span>
          </div>

          {micNote && <p style={{ margin: 0, padding: '0 14px 6px', fontSize: 11, color: P.danger }}>{micNote}</p>}

          {/* composer */}
          <form onSubmit={send} style={{ display: 'flex', gap: 8, borderTop: `1px solid ${P.line}`, padding: '10px 14px 14px', background: P.surface }}>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={micActive ? (micState === 'transcribing' ? 'Transcribing…' : 'Listening — tap mic again to send…') : 'Ask about properties, agents, inquiries…'}
              aria-label="Ask the desk a question"
              autoFocus
              style={{
                flex: 1,
                minWidth: 0,
                padding: '9px 12px',
                border: `1px solid ${P.line}`,
                borderRadius: 999,
                fontSize: 13.5,
                background: P.white,
                color: P.ink,
                outline: 'none',
              }}
            />
            {engine !== 'none' && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={busy}
                aria-label={micActive ? 'Stop recording' : 'Ask by voice note'}
                className="press"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: micActive ? `1px solid ${P.danger}` : `1px solid ${P.line}`,
                  background: micActive ? P.danger : P.white,
                  color: micActive ? P.white : P.ink,
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                {micState === 'transcribing' ? <Loader2 size={15} className="desk-spin" /> : <Mic size={15} />}
              </button>
            )}
            <button
              type="submit"
              disabled={!q.trim() || busy}
              className="press"
              aria-label="Send"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 999,
                border: 0,
                background: q.trim() && !busy ? P.gold : P.line,
                color: q.trim() && !busy ? P.white : P.sub,
                cursor: q.trim() && !busy ? 'pointer' : 'default',
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </section>
      )}

      {/* launcher */}
      <button
        onClick={open ? () => setOpen(false) : openPanel}
        aria-label="Ask the Desk"
        className="press desk-pulse-soft"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 24,
          zIndex: 61,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          height: 52,
          padding: '0 18px 0 12px',
          borderRadius: 999,
          border: 'none',
          background: P.gold,
          color: P.white,
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(23,23,22,0.22)',
        }}
      >
        <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 999, background: 'rgba(255,255,255,0.22)' }}>
          {ui.phase === 'thinking' ? <Loader2 size={16} className="desk-spin" /> : <MessageCircle size={16} />}
        </span>
        {open ? 'Hide' : 'Ask the Desk'}
      </button>
    </>
  );

  function send(e: FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text || busy) return;
    talk.current?.ask(text);
    setQ('');
  }
}

function EmailButton({ draft, state, onSend }: { draft: EmailDraft; state: 'idle' | 'sending' | 'sent' | 'error'; onSend: () => void }) {
  const label =
    state === 'sending' ? (
      <>
        <Loader2 size={12} className="desk-spin" /> Sending…
      </>
    ) : state === 'sent' ? (
      <>✓ Sent to {draft.to}</>
    ) : state === 'error' ? (
      <>Failed — tap to retry</>
    ) : (
      <>
        <Mail size={12} /> Send email to {draft.to}
      </>
    );
  return (
    <button
      onClick={() => state !== 'sending' && onSend()}
      className="press"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        padding: '5px 10px',
        borderRadius: 999,
        border: `1px solid ${state === 'error' ? P.danger : state === 'sent' ? P.olive : P.goldDark}`,
        background: state === 'sent' ? P.olive : P.white,
        color: state === 'sent' ? P.white : state === 'error' ? P.danger : P.goldDark,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

const ctrl = (active: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 999,
  border: `1px solid ${active ? P.goldDark : P.line}`,
  background: active ? P.gold : P.white,
  color: active ? P.white : P.ink,
  cursor: 'pointer',
});