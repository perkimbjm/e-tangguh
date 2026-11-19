import { useEffect, useRef, useState, type RefObject } from 'react';

/** `true` bila pengguna meminta gerak dikurangi (prefers-reduced-motion). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** `true` setelah elemen pertama kali masuk layar (sekali saja). */
export function useInView<T extends Element>(
  options: IntersectionObserverInit = { threshold: 0.2 },
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const { threshold, rootMargin } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, threshold, rootMargin]);
  return [ref, inView];
}

/** Berlangganan gulir dengan throttling requestAnimationFrame. */
function useScrollFrame(onFrame: () => void): void {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame = 0;
      cb.current();
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Kemajuan gulir 0..1 sebuah bagian. `enter`: dari bagian atas menyentuh bawah layar sampai
 * bagian bawah meninggalkan atas layar. `pin`: selama bagian lengket memenuhi layar. `leave`:
 * dari bagian atas di atas layar sampai seluruh bagian tergulir lewat.
 */
export function useSectionProgress<T extends HTMLElement>(
  mode: 'enter' | 'pin' | 'leave' = 'enter',
): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  useScrollFrame(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const p =
      mode === 'pin'
        ? -r.top / Math.max(1, r.height - vh)
        : mode === 'leave'
          ? -r.top / Math.max(1, r.height)
          : (vh - r.top) / (r.height + vh);
    setProgress((prev) => {
      const next = clamp01(p);
      return Math.abs(next - prev) > 0.002 ? next : prev;
    });
  });
  return [ref, progress];
}

/** Kemajuan gulir seluruh halaman 0..1. */
export function usePageProgress(): number {
  const [p, setP] = useState(0);
  useScrollFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    setP(max > 0 ? clamp01(window.scrollY / max) : 0);
  });
  return p;
}

/** Hitung naik dari 0 ke `target` saat `active`; langsung nilai akhir bila gerak dikurangi. */
export function useCountUp(target: number, active: boolean, durationMs = 1400): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = clamp01((now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, target, durationMs, reduced]);
  return value;
}

/** Indeks langkah yang sedang berada di tengah layar. */
export function useActiveStep(
  count: number,
): [(index: number) => (el: HTMLElement | null) => void, number] {
  const [active, setActive] = useState(0);
  const elements = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    elements.current.slice(0, count).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [count]);
  const register = (index: number) => (el: HTMLElement | null) => {
    elements.current[index] = el;
  };
  return [register, active];
}
