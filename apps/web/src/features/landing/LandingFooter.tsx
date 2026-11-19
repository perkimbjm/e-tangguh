import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

export function LandingFooter() {
  return (
    <footer className="bg-gradient-to-b from-sungai-900 to-sungai-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <Reveal from="skala">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Siap menyusun laporan SPM tahun ini?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sungai-100">Masuk dengan akun yang diberikan BPBD Kota Banjarmasin.</p>
          <Link
            to="/masuk"
            className="mt-8 inline-block rounded-full bg-senja-400 px-8 py-3.5 font-bold text-sungai-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-senja-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Masuk ke e-Tangguh
          </Link>
        </Reveal>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-sungai-300 sm:flex-row sm:justify-between">
          <p>e-Tangguh · Basis data SPM sub-urusan bencana BPBD Kota Banjarmasin</p>
          <p>Versi pengembangan. Angka dan nama kelurahan pada halaman ini adalah ilustrasi, bukan data warga.</p>
        </div>
      </div>
    </footer>
  );
}
