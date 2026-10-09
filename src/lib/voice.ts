import { askDesk, type EmailDraft } from './api';
import { forSpeech } from './speech-text';

// The voice agent, chat-in / voice-out: you type, the desk answers the way it
// speaks. The wake phrase and microphone capture are gone — input is text, only
// the output is spoken (browser speech synthesis, upgraded later if we want a
// paid voice). Answers stay grounded in the same server-side digest.

export type VoicePhase = 'off' | 'idle' | 'thinking' | 'speaking' | 'error';

export type VoiceTurn = { q: string; a: string; used: string; email?: EmailDraft | null };

export type VoiceUI = {
  powered: boolean;
  phase: VoicePhase;
  heard: string;
  answer: string;
  used: string;
  turns: VoiceTurn[];
  muted: boolean;
  error: string | null;
};

const GREETING = 'Welcome to the Real Estate Ops Desk. How may I help you?';

export class DeskTalk {
  private emit: (u: VoiceUI) => void;
  private gen = 0;
  private isOn = false;

  private ui: VoiceUI = {
    powered: false,
    phase: 'off',
    heard: '',
    answer: '',
    used: '',
    turns: [],
    muted: false,
    error: null,
  };

  constructor(emit: (u: VoiceUI) => void) {
    this.emit = emit;
  }

  private get phase(): VoicePhase {
    return this.ui.phase;
  }

  get powered(): boolean {
    return this.ui.powered;
  }

  private push(patch: Partial<VoiceUI>) {
    this.ui = { ...this.ui, ...patch };
    this.emit(this.ui);
  }

  private setPhase(phase: VoicePhase) {
    this.push({ phase });
  }

  async power() {
    if (this.isOn) return;
    this.isOn = true;
    this.push({ powered: true, error: null });
    await this.speak(GREETING);
    if (this.isOn) this.setPhase('idle');
  }

  powerOff() {
    this.isOn = false;
    this.gen++;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.push({ powered: false, phase: 'off', heard: '', answer: '', used: '', turns: [], error: null });
  }

  toggleMute() {
    this.push({ muted: !this.ui.muted });
  }

  interrupt() {
    this.gen++;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (this.phase === 'speaking' || this.phase === 'thinking') this.setPhase('idle');
  }

  destroy() {
    this.powerOff();
  }

  async ask(question: string) {
    const q = question.trim();
    if (!q) return;
    const gen = ++this.gen;
    this.push({ phase: 'thinking', heard: q, error: null });
    try {
      const r = await askDesk(q);
      if (gen !== this.gen) return;
      // Voice-first: the written answer lands the moment speech actually starts,
      // then reveals word by word while it speaks — never text-before-voice.
      let shown = false;
      const showText = () => {
        if (shown) return;
        shown = true;
        if (gen !== this.gen) return;
        this.push({
          answer: r.answer,
          used: r.used,
          turns: [{ q, a: r.answer, used: r.used, email: r.email }, ...this.ui.turns].slice(0, 8),
        });
      };
      const kick = window.setTimeout(showText, 1200);
      await this.speak(r.answer, showText);
      window.clearTimeout(kick);
      showText();
      if (gen === this.gen && this.isOn) this.setPhase('idle');
    } catch {
      if (gen !== this.gen) return;
      this.push({ phase: 'error', error: 'I could not reach the desk just now.' });
      window.setTimeout(() => {
        if (this.isOn && gen === this.gen) this.setPhase('idle');
      }, 1500);
    }
  }

  private async speak(text: string, onStart?: () => void) {
    if (this.ui.muted || !('speechSynthesis' in window)) return;
    this.setPhase('speaking');
    const utter = new SpeechSynthesisUtterance(forSpeech(text));
    utter.rate = 1.02;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find((v) => /en/i.test(v.lang) && /Google UK English Female|Sonia|Serena|Libby|Samantha/i.test(v.name)) ??
      voices.find((v) => /en-GB/i.test(v.lang)) ??
      voices.find((v) => /en/i.test(v.lang));
    if (pick) utter.voice = pick;
    await new Promise<void>((resolve) => {
      utter.onstart = () => {
        onStart?.();
        onStart = undefined;
      };
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }
}