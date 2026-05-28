'use client';

import { useEffect, useRef, useState } from 'react';
import { HpButton } from '@/components/ui/HpButton';
import { useT } from '@/lib/i18n/locale-context';

interface Props {
  onCaptured: (blob: Blob, fileName: string, mimeType: string) => void;
  onCleared?: () => void;
  disabled?: boolean;
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
  for (const mt of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(mt)) return mt;
  }
  return 'audio/webm';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VoiceRecorder({ onCaptured, onCleared, disabled }: Props) {
  const t = useT();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<'idle' | 'recording' | 'captured' | 'unsupported'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [, setMimeType] = useState(pickMimeType());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
    }
    return () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== 'recording') return;
    setSeconds(0);
    const tt = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tt);
  }, [state]);

  async function start() {
    setError(null);
    try {
      const mt = pickMimeType();
      setMimeType(mt);
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const rec = new MediaRecorder(s, { mimeType: mt });
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: mt });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const ext = mt.includes('webm') ? 'webm' : mt.includes('ogg') ? 'ogg' : 'm4a';
        onCaptured(blob, `voice-${Date.now()}.${ext}`, mt);
        stream.current?.getTracks().forEach((tr) => tr.stop());
        stream.current = null;
        setState('captured');
      };
      mediaRecorder.current = rec;
      rec.start();
      setState('recording');
    } catch (err) {
      setError((err as Error).message || t('voice.mic_denied'));
    }
  }

  function stop() {
    mediaRecorder.current?.stop();
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    chunks.current = [];
    setSeconds(0);
    setState('idle');
    onCleared?.();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAudioUrl(url);
    setState('captured');
    onCaptured(f, f.name, f.type || 'application/octet-stream');
  }

  if (state === 'unsupported') {
    return (
      <div className="bg-hp-inset p-6">
        <p className="text-sm text-hp-body">{t('voice.unsupported')}</p>
        <label className="mt-4 inline-block eyebrow text-hp-ink cursor-pointer">
          {t('voice.upload')}
          <input type="file" accept="audio/*" className="hidden" onChange={onFile} disabled={disabled} />
        </label>
      </div>
    );
  }

  return (
    <div className="bg-hp-card border border-hp-rule p-5 sm:p-7">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <span className="block eyebrow mb-2">{t('voice.title')}</span>
          <p className="font-body text-hp-body text-sm leading-relaxed">{t('voice.description')}</p>
          <p className="mt-2 text-xs text-hp-muted">
            {state === 'recording' && `${t('voice.recording')} · ${formatTime(seconds)}`}
            {state === 'captured' && t('voice.captured')}
            {state === 'idle' && t('voice.idle')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {state === 'idle' && (
            <HpButton type="button" onClick={start} disabled={disabled} className="w-full sm:w-auto">
              {t('voice.start')}
            </HpButton>
          )}
          {state === 'recording' && (
            <HpButton type="button" variant="destructive" onClick={stop} className="w-full sm:w-auto">
              {t('voice.stop')}
            </HpButton>
          )}
          {state === 'captured' && (
            <HpButton type="button" variant="secondary" onClick={reset} disabled={disabled} className="w-full sm:w-auto">
              {t('voice.rerecord')}
            </HpButton>
          )}
        </div>
      </div>

      {audioUrl && (
        <div className="mt-5">
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}

      <div className="mt-5 hp-divider" />
      <label className="mt-5 inline-block eyebrow text-hp-ink cursor-pointer">
        {t('voice.or_upload')}
        <input type="file" accept="audio/*" className="hidden" onChange={onFile} disabled={disabled} />
      </label>

      {error && <p className="mt-3 text-xs text-hp-pink">{error}</p>}
    </div>
  );
}
