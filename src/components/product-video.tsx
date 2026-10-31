"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.2v13.6L19 12 8 5.2Z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 5h3.5v14H7V5Zm6.5 0H17v14h-3.5V5Z" />
    </svg>
  );
}

function SoundOnIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4v-5Z" fill="currentColor" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SoundOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4v-5Z" fill="currentColor" />
      <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProductVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(109);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    setMuted(next);
  }, [muted]);

  const seek = useCallback((value: string) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Number(value);
    video.currentTime = next;
    setTime(next);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void frame.requestFullscreen?.();
    }
  }, []);

  // Un video de 1:49 no debe seguir sonando cuando el visitante ya scrolleó a otra sección.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !video.paused) video.pause();
      },
      { threshold: 0.15 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="mx-auto mt-10 w-full max-w-[880px]">
      <div
        ref={frameRef}
        className="relative border border-ink bg-ink text-paper shadow-[0_28px_60px_-38px_rgba(23,25,30,0.8)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/15 px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/65">
            Tour del producto · 1:49
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7ec8a3]">
            GRATIS no es suficiente
          </span>
        </div>

        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className="h-full w-full cursor-pointer object-cover"
            poster="/video/why-datosprivados-poster.jpg"
            preload="none"
            playsInline
            muted={muted}
            onClick={toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            aria-label="Video: por qué el registro gratuito en el SIPDP no es suficiente y cómo DatosPrivados cubre el resto. Dura 1 minuto 49 segundos."
          >
            <source src="/video/why-datosprivados.webm" type="video/webm" />
            <source src="/video/why-datosprivados.mp4" type="video/mp4" />
            Tu navegador no puede reproducir este video.
          </video>

          {!playing && (
            <button
              type="button"
              onClick={toggle}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/35 transition-colors hover:bg-black/25"
              aria-label="Reproducir video"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-black/45 pl-1 text-white backdrop-blur-sm">
                <PlayIcon className="h-7 w-7" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/85">
                Ver el video · 1:49
              </span>
            </button>
          )}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-black/90 to-transparent"
            aria-hidden="true"
          />

          <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-2.5 px-3 pb-3 pt-8 text-white">
            <button
              type="button"
              onClick={toggle}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/35 backdrop-blur-sm transition-colors hover:bg-white/15"
              aria-label={playing ? "Pausar video" : "Reproducir video"}
            >
              {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-[1px] h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/35 backdrop-blur-sm transition-colors hover:bg-white/15"
              aria-label={muted ? "Activar sonido" : "Silenciar video"}
            >
              {muted ? <SoundOffIcon className="h-4 w-4" /> : <SoundOnIcon className="h-4 w-4" />}
            </button>

            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              value={Math.min(time, duration)}
              onChange={(event) => seek(event.target.value)}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-crimson"
              aria-label="Avanzar o retroceder el video"
            />

            <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/85">
              {formatTime(time)} / {formatTime(Math.round(duration))}
            </span>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/35 backdrop-blur-sm transition-colors hover:bg-white/15"
              aria-label="Ver en pantalla completa"
            >
              <ExpandIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        <span>Video horizontal · 1:49 · 5 razones con las pantallas de la app</span>
        <span>Audio y subtítulos en pantalla</span>
      </figcaption>
    </figure>
  );
}
