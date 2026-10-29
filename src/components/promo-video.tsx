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

export function PromoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const started = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(102);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
      userPaused.current = false;
    } catch {
      setPlaying(false);
    }
  }, []);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      play();
    } else {
      userPaused.current = true;
      video.pause();
    }
  }, [play]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    if (connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) {
          if (!started.current) {
            started.current = true;
            play();
          }
        } else if (!entry.isIntersecting && !video.paused) {
          video.pause();
        }
      },
      { threshold: 0.45 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [play]);

  return (
    <div className="relative mx-auto w-full max-w-[352px]">
      <div
        className="pointer-events-none absolute -inset-x-10 -inset-y-12 rounded-[999px] bg-crimson/15 blur-[80px]"
        aria-hidden="true"
      />

      <div className="relative rounded-[2.7rem] border border-paper/25 bg-[#08090c] p-[9px] shadow-[0_45px_90px_-35px_rgba(0,0,0,0.85)]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[2.15rem] bg-black">
          <video
            ref={videoRef}
            className="h-full w-full cursor-pointer object-cover"
            poster="/video/datosprivados-poster.jpg"
            preload="none"
            playsInline
            muted
            loop
            onClick={toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            aria-label="Video explicativo de la Ley 29733 para negocios peruanos, 1 minuto 42 segundos"
          >
            <source src="/video/datosprivados.webm" type="video/webm" />
            <source src="/video/datosprivados.mp4" type="video/mp4" />
            Tu navegador no puede reproducir este video.
          </video>

          {/* Dynamic island */}
          <div
            className="pointer-events-none absolute left-1/2 top-2 z-30 h-[20px] w-[86px] -translate-x-1/2 rounded-full bg-[#08090c]"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-black via-black/75 to-transparent"
            aria-hidden="true"
          />

          {!playing && (
            <button
              type="button"
              onClick={toggle}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/15"
              aria-label="Reproducir video"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-black/40 pl-1 text-white backdrop-blur-sm">
                <PlayIcon className="h-7 w-7" />
              </span>
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-2 p-3 text-white">
            <button
              type="button"
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/35 backdrop-blur-sm transition-colors hover:bg-white/15"
              aria-label={playing ? "Pausar video" : "Reproducir video"}
            >
              {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-[1px] h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                const next = !muted;
                video.muted = next;
                setMuted(next);
                if (!next && video.paused) play();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/35 backdrop-blur-sm transition-colors hover:bg-white/15"
              aria-label={muted ? "Activar sonido" : "Silenciar video"}
            >
              {muted ? <SoundOffIcon className="h-4 w-4" /> : <SoundOnIcon className="h-4 w-4" />}
            </button>

            <span className="ml-auto rounded-full bg-black/40 px-2.5 py-1 font-mono text-[9px] tracking-[0.06em] text-white/85 backdrop-blur-sm">
              {formatTime(time)} / {formatTime(Math.ceil(duration))}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-paper/40">
        1:42 · Video vertical · información general, no asesoría legal
      </p>
    </div>
  );
}
