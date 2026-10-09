import { getToken } from './api';

// Voice-note input for the desk agent: a mic button in the composer. It prefers
// server-side Whisper (accurate on names like Ewet / Uyo), and falls back to the
// browser's recognizer when no GROQ key is configured.

export type MicEngine = 'whisper' | 'browser' | 'none';

export async function detectMicEngine(): Promise<MicEngine> {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  try {
    const r = await fetch('/api/transcribe');
    if (r.ok) {
      const j = (await r.json()) as { provider?: string | null };
      if (j.provider) return 'whisper';
    }
  } catch {
    /* server unreachable — fall through */
  }
  if (w.SpeechRecognition || w.webkitSpeechRecognition) return 'browser';
  return 'none';
}

export class MicRecorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: BlobPart[] = [];

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    this.rec = new MediaRecorder(this.stream, { mimeType: mime });
    this.chunks = [];
    this.rec.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.rec.start();
  }

  stop(): Promise<string> {
    return new Promise((resolve, reject) => {
      const rec = this.rec;
      const stream = this.stream;
      if (!rec || !stream) return reject(new Error('not recording'));
      rec.onstop = async () => {
        for (const t of stream.getTracks()) t.stop();
        const blob = new Blob(this.chunks, { type: rec.mimeType });
        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': rec.mimeType, Authorization: `Bearer ${getToken()}` },
            body: blob,
          });
          if (!res.ok) throw new Error(`transcribe ${res.status}`);
          const j = (await res.json()) as { text?: string };
          resolve((j.text ?? '').trim());
        } catch (e) {
          reject(e);
        }
      };
      rec.stop();
    });
  }

  cancel(): void {
    try {
      this.rec?.stop();
      for (const t of this.stream?.getTracks() ?? []) t.stop();
    } catch {
      /* ignore */
    }
  }
}

export class BrowserMic {
  private rec: unknown = null;
  private final = '';

  start(onInterim: (text: string, done: boolean) => void, onEnd: () => void): boolean {
    const w = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => {};
    rec.onresult = (ev: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; [i: number]: { transcript: string } }> }) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) this.final += r[0].transcript;
        else interim += r[0].transcript;
      }
      onInterim(this.final + interim, ev.results[ev.resultIndex]?.isFinal ?? false);
    };
    rec.onend = () => {
      onInterim(this.final, true);
      onEnd();
    };
    rec.onerror = () => {
      onInterim(this.final, true);
      onEnd();
    };
    this.rec = rec;
    rec.start();
    return true;
  }

  finalText(): string {
    return this.final.trim();
  }

  stop(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try {
      (this.rec as any)?.stop();
    } catch {
      /* ignore */
    }
  }
}