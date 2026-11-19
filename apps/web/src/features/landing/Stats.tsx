import { Reveal } from './Reveal';
import { useCountUp, useInView } from './hooks';

const STATS = [
  { value: 12, suffix: '', label: 'formulir Form 5.A', note: 'warga, petugas, kejadian, logistik' },
  { value: 10, suffix: '', label: 'jenis bencana', note: 'dikelompokkan menjadi variasi kerawanan' },
  { value: 52, suffix: '', label: 'kelurahan', note: 'tiap pendata hanya melihat kelurahannya' },
  { value: 5, suffix: ' dtk', label: 'target rekap sekota', note: 'untuk hingga 200.000 warga' },
];

function Stat({ value, suffix, label, note, active, delay }: (typeof STATS)[number] & { active: boolean; delay: number }) {
  const n = useCountUp(value, active, 1200 + delay);
  return (
    <div className="rounded-2xl border border-sungai-100 bg-white p-6 shadow-sm">
      <p className="text-5xl font-extrabold tabular-nums tracking-tight text-sungai-800">
        <span aria-hidden="true">
          {n}
          {suffix}
        </span>
        <span className="sr-only">
          {value}
          {suffix}
        </span>
      </p>
      <p className="mt-2 font-bold text-sungai-950">{label}</p>
      <p className="mt-1 text-sm text-slate-600">{note}</p>
    </div>
  );
}

export function Stats() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  return (
    <section aria-labelledby="judul-angka" className="relative bg-sungai-50 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <h2 id="judul-angka" className="max-w-2xl text-3xl font-extrabold tracking-tight text-sungai-950 sm:text-4xl">
            Satu basis data untuk seluruh siklus pelaporan tahunan.
          </h2>
        </Reveal>
        <div ref={ref} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 120}>
              <Stat {...s} active={inView} delay={i * 150} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
