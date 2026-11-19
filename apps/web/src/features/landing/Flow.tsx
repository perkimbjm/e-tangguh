import { Reveal } from './Reveal';
import { useSectionProgress } from './hooks';

const FLOW = [
  {
    who: 'Pendata kelurahan',
    what: 'Mengisi atau mengunggah data warga kelurahannya',
    tag: 'menunggu',
  },
  {
    who: 'Operator BPBD',
    what: 'Memeriksa lalu menyetujui atau mengembalikan dengan catatan',
    tag: 'disetujui',
  },
  {
    who: 'Admin BPBD',
    what: 'Memfinalkan tahun anggaran; data terkunci dan diarsipkan',
    tag: 'final',
  },
  {
    who: 'Pemerintah provinsi dan pusat',
    what: 'Menerima Form 5.A dalam susunan resmi',
    tag: 'dilaporkan',
  },
];

export function Flow() {
  const [ref, progress] = useSectionProgress<HTMLElement>('enter');
  const fill = Math.min(1, Math.max(0, (progress - 0.2) / 0.5));
  return (
    <section id="alur" ref={ref} aria-labelledby="judul-alur" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sungai-700">
            Alur persetujuan
          </p>
          <h2
            id="judul-alur"
            className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-sungai-950 sm:text-4xl"
          >
            Hanya data yang sudah disetujui BPBD yang masuk laporan.
          </h2>
        </Reveal>
        <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
          <div
            aria-hidden="true"
            className="absolute left-5 top-0 h-full w-1 rounded bg-slate-100 md:left-0 md:top-5 md:h-1 md:w-full"
          >
            <div
              className="h-full w-full origin-top rounded bg-gradient-to-b from-sungai-500 to-senja-400 md:origin-left md:bg-gradient-to-r"
              style={{ transform: `var(--flow-scale)` }}
            />
          </div>
          <style>{`:root{--flow-scale:scaleY(${fill})}@media (min-width:768px){:root{--flow-scale:scaleX(${fill})}}`}</style>
          {FLOW.map((f, i) => {
            const reached = fill >= i / (FLOW.length - 1) - 0.01;
            return (
              <li key={f.who} className="relative pl-16 md:pl-0 md:pt-14">
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white font-extrabold shadow transition-colors duration-500 md:-top-0.5 ${
                    reached ? 'bg-senja-400 text-sungai-950' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {i + 1}
                </span>
                <Reveal delay={i * 120}>
                  <h3 className="text-lg font-extrabold text-sungai-950">{f.who}</h3>
                  <p className="mt-1 text-slate-700">{f.what}</p>
                  <span className="mt-3 inline-block rounded-full bg-sungai-50 px-3 py-1 text-xs font-bold text-sungai-800">
                    status: {f.tag}
                  </span>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
