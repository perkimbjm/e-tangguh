import { Reveal } from './Reveal';

const ITEMS = [
  { icon: 'kunci', title: 'Data sensitif terenkripsi', body: 'NIK, nomor KK, alamat rinci, dan jenis kebutuhan khusus dienkripsi per kolom. Daftar hanya menampilkan empat digit terakhir NIK.' },
  { icon: 'jejak', title: 'Jejak audit tak dapat diubah', body: 'Setiap perubahan, ekspor, dan pembukaan rincian tercatat: siapa, kapan, dari mana. Basis data menolak pengubahan catatan audit.' },
  { icon: 'peran', title: 'Akses menurut peran dan wilayah', body: 'Akses default ditolak. Pendata hanya melihat kelurahannya; daftar perorangan hanya untuk peran BPBD berwenang.' },
  { icon: 'sintetis', title: 'Uji coba dengan data sintetis', body: 'Data warga nyata tidak dipakai untuk pengembangan atau pengujian. Lembar kerja asli tidak pernah masuk repositori kode.' },
];

const PATHS: Record<string, string> = {
  kunci: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  jejak: 'M4 5h16M4 10h16M4 15h10M4 20h6',
  peran: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  sintetis: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
};

export function Trust() {
  return (
    <section id="perlindungan" aria-labelledby="judul-perlindungan" className="bg-sungai-950 py-24 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-senja-300">Perlindungan data pribadi</p>
          <h2 id="judul-perlindungan" className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Dirancang sejak awal mengikuti UU Pelindungan Data Pribadi.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {ITEMS.map((it, i) => (
            <Reveal key={it.title} delay={i * 100} from={i % 2 ? 'kanan' : 'kiri'}>
              <article className="group h-full rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-senja-400/50 hover:bg-white/10">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 stroke-senja-300 transition group-hover:scale-110" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={PATHS[it.icon]} />
                </svg>
                <h3 className="mt-4 text-xl font-bold">{it.title}</h3>
                <p className="mt-2 leading-relaxed text-sungai-100">{it.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
