import { StoryVisual } from './StoryVisual';
import { useActiveStep } from './hooks';

const STEPS = [
  {
    kicker: '01 · Pendataan',
    title: 'Setiap warga tercatat satu kali',
    body: 'Pendata kelurahan mengisi formulir atau mengunggah lembar kerja. NIK menjadi kunci satu catatan per orang, sehingga data yang sama tidak diketik dua kali. Setiap baris divalidasi; baris yang salah dilaporkan beserta alasannya.',
    points: ['Templat resmi siap unduh', 'Nama kelurahan dicocokkan otomatis', 'Disetujui operator BPBD sebelum dihitung'],
  },
  {
    kicker: '02 · Kawasan rawan',
    title: 'Kerawanan mengikuti RT/RW',
    body: 'BPBD menetapkan kawasan rawan per RT/RW. Jenis bencana warga terisi otomatis dari kawasannya, dan kelompok umur rentan dihitung dari tanggal lahir pada tanggal acuan tahun anggaran.',
    points: ['10 jenis bencana Form 5.A', 'Balita, anak, lansia terhitung otomatis', 'Kebutuhan khusus tersimpan terenkripsi'],
  },
  {
    kicker: '03 · Rekapitulasi',
    title: 'Angka dihitung, bukan diketik',
    body: 'Form 5.A.3, 5.A.4, dan 5.A.6 tersusun langsung dari data rincian. Klik angka mana pun untuk melihat daftar warga penyusunnya. Angka dan daftarnya berasal dari satu definisi, sehingga selalu sama.',
    points: ['Variasi kerawanan dikelompokkan otomatis', 'Hanya data disetujui yang masuk rekap', 'Setiap angka dapat ditelusuri'],
  },
  {
    kicker: '04 · Pelaporan',
    title: 'Laporan SPM siap diserahkan',
    body: 'Ekspor XLSX dan PDF mengikuti susunan dan penomoran kolom formulir resmi. Saat tahun anggaran difinalkan, data terkunci dan arsipnya tersimpan; koreksi sesudahnya menjadi revisi bernomor.',
    points: ['Paket seluruh Form 5.A dalam satu unduhan', 'Arsip finalisasi dengan sidik SHA-256', 'Tahun baru dibuka dengan salin maju'],
  },
];

export function StoryScrolly() {
  const [register, active] = useActiveStep(STEPS.length);
  return (
    <section id="cerita" aria-labelledby="judul-cerita" className="relative bg-gradient-to-b from-sungai-950 to-sungai-900 text-white">
      <div className="mx-auto max-w-6xl px-4 pt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-senja-300">Cara kerja</p>
        <h2 id="judul-cerita" className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">
          Dari lembar kerja kelurahan menjadi laporan SPM, dalam empat langkah.
        </h2>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-24 md:grid-cols-2 md:gap-12">
        <div className="sticky top-14 z-0 -mb-[42vh] h-[42vh] pt-3 md:top-0 md:mb-0 md:order-2 md:flex md:h-screen md:items-center md:pt-0">
          <div className="h-full w-full md:h-[70vh]">
            <StoryVisual step={active} />
          </div>
        </div>
        <ol className="relative z-10 md:order-1">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              ref={register(i)}
              data-step={i}
              className="flex min-h-[85svh] items-start pb-10 pt-[44vh] md:min-h-screen md:items-center md:py-10"
              aria-current={active === i ? 'step' : undefined}
            >
              <article
                className={`rounded-2xl border p-6 backdrop-blur transition-all duration-500 ${
                  active === i ? 'border-senja-400/60 bg-sungai-950/80 opacity-100' : 'border-white/10 bg-sungai-950/60 opacity-60'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-senja-300">{s.kicker}</p>
                <h3 className="mt-2 text-2xl font-extrabold sm:text-3xl">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-sungai-100">{s.body}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-senja-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
