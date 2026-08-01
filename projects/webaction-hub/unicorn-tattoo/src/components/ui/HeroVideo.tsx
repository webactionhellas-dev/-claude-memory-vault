'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { cn } from '@/lib/utils';

/**
 * Full-bleed background film (the studio's own promo), built to be MOVING on
 * every device, every time - including iOS/macOS Low Power Mode, where the OS
 * refuses <video> autoplay outright and paints its own play-button glyph.
 *
 * Three layers, bottom to top:
 *   1. poster <img>  - the film's first frame (the Unicorn Ink logo on glass),
 *                      paints instantly, so there is never a black hole or flash.
 *   2. <video>       - the real film. Muted-autoplay hardening: play() re-asserted
 *                      on readiness / pause / visibility / bfcache / every gesture.
 *   3. canvas        - the Low Power Mode escape hatch. If autoplay is BLOCKED
 *                      (play() rejects or the film sits paused while ready), we
 *                      decode the same film in JS (JSMpeg, /video/hero.m2ts) onto a
 *                      canvas - no autoplay policy applies to canvas painting, so
 *                      the film runs with zero interaction and NO play glyph (the
 *                      <video> is faded to opacity 0 while blocked, and iOS only
 *                      draws the glyph on a visible video element).
 *
 * The instant a real gesture lets the native film start ('playing' fires), the
 * canvas is destroyed and the <video> crossfades back in, time-synced to the
 * canvas playhead so the film does not visibly jump.
 *
 * `?lpm=1` forces the blocked path for desktop testing/demo.
 *
 * SOURCE ORDER (browser plays the FIRST it can decode):
 *   hero-hevc.mp4  1080p HEVC (hvc1)  - Safari / iOS
 *   hero-av1.mp4   1080p AV1          - Chrome/Edge/FF/Android
 *   hero-h264.mp4  720p  H.264        - old iOS/Android, anything
 *   hero.m2ts      540p  MPEG1-TS     - canvas fallback stream (blocked only)
 */
export default function HeroVideo({
  className,
  videoRef: externalRef
}: {
  className?: string;
  /** optional shared ref so an overlay (e.g. the WebGL grade) can sample the same
   *  <video> element without downloading the film twice */
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef ?? localRef;
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const host = canvasHostRef.current;
    if (!video || !host) return;

    // React can drop the `muted` attribute on hydration; force it on the node so
    // the browser treats this as muted autoplay - allowed without a user gesture.
    video.muted = true;
    video.defaultMuted = true;

    let disposed = false;
    let fallbackWanted = false;
    let fallbackPlayer: { currentTime?: number; destroy?: () => void } | null = null;
    const forced = new URLSearchParams(window.location.search).get('lpm') === '1';

    // ---- canvas fallback (engages ONLY when autoplay is blocked) ------------
    const startFallback = async () => {
      if (fallbackWanted || disposed) return;
      fallbackWanted = true;
      setBlocked(true); // fades the <video> out -> iOS never draws its glyph
      try {
        const mod = await import('@cycjimmy/jsmpeg-player');
        if (!fallbackWanted || disposed || fallbackPlayer) return;
        const JSMpeg = (mod as { default?: unknown }).default ?? mod;
        const canvas = document.createElement('canvas');
        canvas.className = 'pointer-events-none absolute inset-0 h-full w-full object-cover';
        canvas.setAttribute('aria-hidden', 'true');
        host.appendChild(canvas);
        fallbackPlayer = new (JSMpeg as { Player: new (url: string, opts: object) => never }).Player(
          '/video/hero.m2ts',
          {
            canvas,
            loop: true,
            audio: false,
            autoplay: true,
            pauseWhenHidden: true,
            videoBufferSize: 2 * 1024 * 1024
          }
        );
      } catch {
        // decoder failed to load: keep the poster; the gesture kick below still
        // restores the native film on the first touch.
      }
    };

    const stopFallback = () => {
      fallbackWanted = false;
      try {
        fallbackPlayer?.destroy?.();
      } catch {
        /* best-effort teardown */
      }
      fallbackPlayer = null;
      while (host.firstChild) host.removeChild(host.firstChild);
      setBlocked(false);
    };

    // ---- native playback, re-asserted from everywhere -----------------------
    // Idempotent, so it is safe to fire from many events. When the canvas is
    // running, sync the film to the canvas playhead first so a successful
    // native start does not visibly jump the picture.
    const play = () => {
      if (forced) return; // demo mode: stay on the canvas path
      if (fallbackPlayer && typeof fallbackPlayer.currentTime === 'number') {
        const t = fallbackPlayer.currentTime;
        const d = video.duration;
        if (isFinite(t) && t > 0 && isFinite(d) && d > 0 && Math.abs(video.currentTime - t) > 0.75) {
          try {
            video.currentTime = t % d;
          } catch {
            /* not seekable yet - start from wherever it can */
          }
        }
      }
      const p = video.play();
      if (p && typeof p.catch === 'function')
        p.catch((err: unknown) => {
          // The OS said no (Low Power Mode / data saver): go to canvas at once.
          if ((err as { name?: string })?.name === 'NotAllowedError') startFallback();
        });
    };

    if (forced) {
      // Faithful Low Power Mode simulation: the OS would refuse the autoplay
      // attribute, so strip it and keep the film paused for this page view.
      video.autoplay = false;
      video.removeAttribute('autoplay');
      video.pause();
      startFallback();
    } else {
      play();
    }

    // The native film actually rendering is the single source of truth: the
    // moment it plays, the canvas (if any) is torn down and the film fades in.
    const onPlaying = () => {
      if (forced) {
        video.pause(); // demo mode: never let the native film take over
        return;
      }
      if (fallbackWanted) stopFallback();
    };
    video.addEventListener('playing', onPlaying);

    const readyEvents = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'];
    readyEvents.forEach((e) => video.addEventListener(e, play));

    // Timed nudges for the case where the file needs a moment to buffer before
    // the browser will honour autoplay.
    const timers = [300, 900, 2500].map((ms) => window.setTimeout(play, ms));

    // Watchdog: the film is decodable but still paused -> autoplay is being
    // blocked without a rejected promise (some Safari builds do this). Canvas.
    const watchdogs = [1200, 3200].map((ms) =>
      window.setTimeout(() => {
        if (!forced && video.paused && video.readyState >= 2) startFallback();
      }, ms)
    );

    // If ANYTHING ever pauses it, resume at once - it must never sit paused.
    const onPause = () => {
      if (!document.hidden) play();
    };
    video.addEventListener('pause', onPause);

    const onVisible = () => {
      if (!document.hidden) play();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', play); // iOS back/forward-cache restore
    window.addEventListener('focus', play);

    // PERSISTENT gesture kick (never self-removes): every touch/scroll/tap/key
    // re-asserts playback. touchend/pointerup/click carry real user activation
    // (touchstart alone does not in Safari), so in Low Power Mode the native
    // film takes over from the canvas on the very first interaction.
    const gestureEvents = [
      'touchstart',
      'touchend',
      'pointerdown',
      'pointerup',
      'mousedown',
      'click',
      'keydown',
      'scroll',
      'wheel'
    ];
    const kick = () => play();
    gestureEvents.forEach((e) =>
      window.addEventListener(e, kick, { capture: true, passive: true } as AddEventListenerOptions)
    );

    // Re-assert playback when the hero scrolls back into view (never paused off
    // screen - it should always be running when you return).
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) play();
      },
      { threshold: 0.05 }
    );
    io.observe(video);

    return () => {
      disposed = true;
      stopFallback();
      video.removeEventListener('playing', onPlaying);
      readyEvents.forEach((e) => video.removeEventListener(e, play));
      video.removeEventListener('pause', onPause);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', play);
      window.removeEventListener('focus', play);
      gestureEvents.forEach((e) =>
        window.removeEventListener(e, kick, { capture: true } as EventListenerOptions)
      );
      timers.forEach((t) => clearTimeout(t));
      watchdogs.forEach((t) => clearTimeout(t));
      io.disconnect();
    };
  }, []);

  return (
    // bg-ink under everything so there is never a white flash; the poster paints
    // the film's first frame over it immediately.
    <div className={cn('relative h-full w-full overflow-hidden bg-ink', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/video/hero-poster.webp"
        alt=""
        aria-hidden="true"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        className={cn(
          'pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
          blocked && 'opacity-0'
        )}
      >
        <source src="/video/hero-hevc.mp4" type='video/mp4; codecs="hvc1"' />
        <source src="/video/hero-av1.mp4" type='video/mp4; codecs="av01.0.08M.08"' />
        <source src="/video/hero-h264.mp4" type='video/mp4; codecs="avc1.640028"' />
      </video>
      {/* JSMpeg canvas mounts here when autoplay is blocked */}
      <div
        ref={canvasHostRef}
        aria-hidden="true"
        className={cn('pointer-events-none absolute inset-0', !blocked && 'hidden')}
      />
    </div>
  );
}
