'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { animate, createScope } from 'animejs';
import { Pause, Play } from 'lucide-react';
import styles from './FabricMotion.module.css';

type FabricManifest = {
  frameCount: number;
  width: number;
  height: number;
  framePattern: string;
  poster: string;
};

type DecodedFrame = { source: CanvasImageSource; width: number; height: number; dispose: () => void };

export type FabricMotionProps = {
  /** A six-digit hex color; a light multiply tint preserves the fabric's folds. */
  color: string;
  /** Portion of the sequence to play, from 0.2 (subtle) to 1 (full movement). */
  intensity: number;
  mode?: 'scroll' | 'loop';
  manifestUrl?: string;
  className?: string;
  fill?: boolean;
};

const DEFAULT_POSTER = '/motion/fabric/poster.webp';
const CONCURRENCY = 3;
const MAX_CACHE_BYTES = 24 * 1024 * 1024;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function parseManifest(value: unknown): FabricManifest {
  if (!value || typeof value !== 'object') throw new Error('Invalid fabric manifest');
  const m = value as Record<string, unknown>;
  const localPath = (path: unknown): path is string => typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('..');
  if (!Number.isInteger(m.frameCount) || Number(m.frameCount) < 2 || Number(m.frameCount) > 240
    || !Number.isInteger(m.width) || Number(m.width) < 64 || Number(m.width) > 1920
    || !Number.isInteger(m.height) || Number(m.height) < 64 || Number(m.height) > 1920
    || !localPath(m.framePattern) || !m.framePattern.includes('{index}') || !localPath(m.poster)) {
    throw new Error('Invalid fabric manifest');
  }
  return m as FabricManifest;
}

async function decodeFrame(url: string, signal: AbortSignal, width: number, height: number): Promise<DecodedFrame> {
  const response = await fetch(url, { signal, cache: 'force-cache' });
  if (!response.ok) throw new Error('Fabric frame unavailable');
  const blob = await response.blob();
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(blob, { resizeWidth: width, resizeHeight: height, resizeQuality: 'medium' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
  }
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  try {
    image.src = objectUrl;
    await image.decode();
    const resized = document.createElement('canvas');
    resized.width = width; resized.height = height;
    const context = resized.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0, width, height);
    image.src = '';
    return { source: resized, width, height, dispose: () => { resized.width = 0; resized.height = 0; } };
  } finally { URL.revokeObjectURL(objectUrl); }
}

export default function FabricMotion({ color, intensity, mode = 'scroll', manifestUrl = '/motion/fabric/manifest.json', className = '', fill = false }: FabricMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const syncPlaybackRef = useRef<(() => void) | null>(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [poster, setPoster] = useState(DEFAULT_POSTER);
  const [posterFailed, setPosterFailed] = useState(false);
  const [ratio, setRatio] = useState(4 / 3);
  const amount = Number.isFinite(intensity) ? clamp(intensity, 0.2, 1) : 0.6;
  const tint = /^#[\da-f]{6}$/i.test(color) ? color : '#ffffff';

  useEffect(() => {
    pausedRef.current = paused;
    syncPlaybackRef.current?.();
  }, [paused]);

  useEffect(() => {
    const root = rootRef.current;
    const media = mediaRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!root || !media || !canvas || !context) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = preference.matches;
    let disposed = false;
    let visible = false;
    let manifest: FabricManifest | null = null;
    let scope: ReturnType<typeof createScope> | null = null;
    let animation: ReturnType<typeof animate> | null = null;
    let manifestStarted = false;
    let target = -1;
    let drawn = -1;
    let painted = false;
    let paintRaf = 0;
    let scrollRaf = 0;
    let cacheLimit = 8;
    let decodeWidth = 960;
    let decodeHeight = 720;
    let queue: number[] = [];
    const progress = { value: 0 };
    const cache = new Map<number, DecodedFrame>();
    const inflight = new Map<number, AbortController>();
    const failed = new Set<number>();
    const manifestController = new AbortController();
    let manifestTimer: ReturnType<typeof setTimeout> | undefined;
    setReady(false);
    setReducedMotion(reduced);
    setPosterFailed(false);

    const canPlay = () => visible && !document.hidden && !reduced && !pausedRef.current;
    const canLoad = () => visible && !document.hidden && !reduced;
    const evict = () => {
      while (cache.size > cacheLimit) {
        // Retain the requested and currently painted frame while releasing decoded memory.
        const key = [...cache.keys()].find(index => index !== target && index !== drawn);
        if (key === undefined) break;
        cache.get(key)?.dispose(); cache.delete(key);
      }
    };
    const paint = () => {
      paintRaf = 0;
      if (disposed || !canLoad()) return;
      let index = target;
      if (!cache.has(index)) {
        const nearest = [...cache.keys()].sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
        if (nearest === undefined || Math.abs(nearest - target) > 4) return;
        index = nearest;
      }
      if (drawn === index) return;
      const frame = cache.get(index);
      if (!frame) return;
      cache.delete(index); cache.set(index, frame);
      const scale = Math.max(canvas.width / frame.width, canvas.height / frame.height);
      const width = frame.width * scale;
      const height = frame.height * scale;
      context.drawImage(frame.source, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      drawn = index;
      canvas.dataset.frame = String(index);
      if (!painted) { painted = true; setReady(true); }
      evict();
    };
    const requestPaint = () => { if (!paintRaf && !disposed && canLoad()) paintRaf = requestAnimationFrame(paint); };
    const pump = () => {
      if (disposed || !manifest || !canLoad()) return;
      while (inflight.size < CONCURRENCY && queue.length) {
        const index = queue.shift()!;
        if (cache.has(index) || inflight.has(index) || failed.has(index)) continue;
        const controller = new AbortController();
        inflight.set(index, controller);
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 12_000);
        const url = manifest.framePattern.replace('{index}', String(index).padStart(3, '0'));
        void decodeFrame(url, controller.signal, decodeWidth, decodeHeight).then(frame => {
          if (disposed || controller.signal.aborted) { frame.dispose(); return; }
          cache.set(index, frame); evict(); requestPaint();
        }).catch(() => {
          if (!disposed && (!controller.signal.aborted || timedOut)) failed.add(index);
        }).finally(() => {
          clearTimeout(timer);
          if (inflight.get(index) === controller) inflight.delete(index);
          if (!disposed) {
            // A cancelled decode can finish after the section re-enters the viewport.
            // Requeue the current target after its old in-flight slot is released.
            if (controller.signal.aborted && canLoad()) selectFrame();
            else pump();
          }
        });
      }
    };
    const selectFrame = () => {
      if (!manifest || disposed) return;
      const start = (1 - amount) / 2;
      const next = Math.round((start + progress.value * amount) * (manifest.frameCount - 1));
      if (next === target && cache.has(next)) { requestPaint(); return; }
      target = next;
      // Replace stale queued work on every seek; never preload the full sequence.
      queue = [0, 1, -1, 2, -2, 3, 4].map(offset => next + offset).filter(index => index >= 0 && index < manifest!.frameCount && !cache.has(index) && !inflight.has(index) && !failed.has(index));
      pump(); requestPaint();
    };
    const updateScroll = () => {
      scrollRaf = 0;
      if (disposed || mode !== 'scroll' || !animation || !canPlay()) return;
      const rect = media.getBoundingClientRect();
      const position = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      animation.seek(position * 1000, true);
      selectFrame();
    };
    const requestScroll = () => { if (!scrollRaf && mode === 'scroll' && canPlay()) scrollRaf = requestAnimationFrame(updateScroll); };
    const stopRequests = () => {
      queue = [];
      for (const controller of inflight.values()) controller.abort();
      cancelAnimationFrame(paintRaf); paintRaf = 0;
      cancelAnimationFrame(scrollRaf); scrollRaf = 0;
    };
    const syncPlayback = () => {
      if (disposed) return;
      if (!canPlay()) {
        animation?.pause();
        if (!visible || document.hidden || reduced) stopRequests();
        else selectFrame(); // A paused remount still needs one frame and its resume control.
        return;
      }
      if (mode === 'loop') animation?.play();
      else requestScroll();
      selectFrame();
    };
    syncPlaybackRef.current = syncPlayback;
    const resize = () => {
      const rect = media.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5, 1600 / Math.max(rect.width, rect.height));
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width; canvas.height = height; drawn = -1;
        // Resizing clears the backing buffer; keep the poster visible until a frame is redrawn.
        if (painted) { painted = false; setReady(false); }
        requestPaint();
      }
      requestScroll();
    };
    const loadManifest = async () => {
      if (manifestStarted || disposed) return;
      manifestStarted = true;
      manifestTimer = setTimeout(() => manifestController.abort(), 8000);
      try {
        const response = await fetch(manifestUrl, { signal: manifestController.signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('Fabric manifest unavailable');
        const next = parseManifest(await response.json());
        if (disposed) return;
        manifest = next;
        const decodeScale = Math.min(1, 1024 / Math.max(next.width, next.height));
        decodeWidth = Math.round(next.width * decodeScale); decodeHeight = Math.round(next.height * decodeScale);
        cacheLimit = clamp(Math.floor(MAX_CACHE_BYTES / (decodeWidth * decodeHeight * 4)), 2, 12);
        setPoster(next.poster); setPosterFailed(false); setRatio(next.width / next.height);
        scope = createScope({ root }).add(() => {
          animation = animate(progress, {
            value: [0, 1], duration: mode === 'loop' ? 5000 * amount : 1000,
            ease: mode === 'loop' ? 'inOutSine' : 'linear', loop: mode === 'loop', alternate: mode === 'loop',
            autoplay: false, frameRate: 24, onUpdate: selectFrame,
          });
        });
        resize(); syncPlayback();
      } catch { /* Decorative motion falls back to its static poster. */ }
      finally { clearTimeout(manifestTimer); }
    };
    const visibility = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) void loadManifest();
      syncPlayback();
    }, { threshold: 0.01 });
    const warmup = new IntersectionObserver(entries => {
      const near = entries[0]?.isIntersecting ?? false;
      if (near) { void loadManifest(); warmup.disconnect(); }
    }, { rootMargin: '200px' });
    const resizeObserver = new ResizeObserver(resize);
    const onPreference = () => {
      reduced = preference.matches; setReducedMotion(reduced);
      if (reduced) { setReady(false); painted = false; }
      else { drawn = -1; requestPaint(); }
      syncPlayback();
    };
    const onVisibility = () => syncPlayback();
    visibility.observe(media); warmup.observe(media); resizeObserver.observe(media);
    preference.addEventListener('change', onPreference);
    document.addEventListener('visibilitychange', onVisibility);
    if (mode === 'scroll') window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    resize();
    return () => {
      disposed = true; syncPlaybackRef.current = null;
      clearTimeout(manifestTimer); manifestController.abort(); stopRequests();
      visibility.disconnect(); warmup.disconnect(); resizeObserver.disconnect();
      preference.removeEventListener('change', onPreference);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', requestScroll); window.removeEventListener('resize', resize);
      scope?.revert();
      for (const frame of cache.values()) frame.dispose();
      cache.clear();
    };
  }, [amount, manifestUrl, mode]);

  return <div ref={rootRef} className={`${styles.fabric} ${fill ? styles.fill : ''} ${className}`}  data-fabric-mode={mode} data-fabric-ready={ready} style={{ '--fabric-tint': tint, '--fabric-ratio': ratio } as CSSProperties}>
    <div ref={mediaRef} className={styles.media}>
      {!posterFailed && <img className={styles.poster} src={poster} alt="" loading="lazy" decoding="async" onError={() => setPosterFailed(true)}/>}
      <canvas ref={canvasRef} className={`${styles.canvas} ${ready && !reducedMotion ? styles.ready : ''}`} aria-hidden="true"/>
      <span className={styles.tint} aria-hidden="true"/>
    </div>
    {mode === 'loop' && ready && !reducedMotion && <div className={styles.controls}><button type="button" className={styles.pauseButton} aria-pressed={paused} aria-label={paused ? 'Retomar movimento do tecido' : 'Pausar movimento do tecido'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} aria-hidden="true"/> : <Pause size={16} aria-hidden="true"/>}<span>{paused ? 'Retomar movimento' : 'Pausar movimento'}</span></button></div>}
  </div>;
}
