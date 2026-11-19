import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useInView } from './hooks';

interface Props {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
  from?: 'bawah' | 'kiri' | 'kanan' | 'skala';
}

const HIDDEN: Record<NonNullable<Props['from']>, string> = {
  bawah: 'translate-y-8',
  kiri: '-translate-x-10',
  kanan: 'translate-x-10',
  skala: 'scale-95',
};

/** Memunculkan isi saat masuk layar. Konten tetap ada di DOM sehingga terbaca tanpa animasi. */
export function Reveal({ children, as: Tag = 'div', delay = 0, className = '', from = 'bawah' }: Props) {
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  const style: CSSProperties = { transitionDelay: `${delay}ms` };
  return (
    <Tag
      ref={ref}
      style={style}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:opacity-100 ${
        inView ? 'translate-x-0 translate-y-0 scale-100 opacity-100' : `opacity-0 ${HIDDEN[from]}`
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
