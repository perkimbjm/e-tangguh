import { useEffect, useRef, useState, type ReactNode } from 'react';
import { type Orientation, size } from './geometry';

/** Menampilkan kartu berukuran asli yang diperbesar agar pas lebar wadah. */
export function CardPreview({
  orientation,
  label,
  children,
}: {
  orientation: Orientation;
  label: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.6);
  const { w, h } = size(orientation);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setScale(Math.min(orientation === 'landscape' ? 2 : 1.7, (e!.contentRect.width || w) / w)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, orientation]);
  return (
    <figure className="w-full">
      <div ref={box} className="w-full">
        <div className="mx-auto" style={{ width: w * scale, height: h * scale }}>
          <div
            className="etg-card-shadow origin-top-left rounded-[12px]"
            style={{ transform: `scale(${scale})`, width: w, height: h }}
          >
            {children}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </figcaption>
    </figure>
  );
}
