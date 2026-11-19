import { BadgeCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Logo } from '../../../app/Sidebar';
import { useVerification } from './api';

/** Halaman publik hasil pindai QR kartu: hanya data minimum, tanpa NIK, foto, atau kontak. */
export function VerifyPage() {
  const { code } = useParams();
  const { data, isLoading, error } = useVerification(code);
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-sungai-950 via-sungai-900 to-sungai-800 px-4 py-10 text-white">
      <Logo />
      <div className="mt-8 w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <h1 className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-sungai-700">
          Verifikasi kartu identitas
        </h1>
        {isLoading && (
          <p role="status" className="mt-6 text-center">
            Memeriksa…
          </p>
        )}
        {error && (
          <div className="mt-6 text-center" role="alert">
            <ShieldX className="mx-auto h-14 w-14 text-red-600" aria-hidden />
            <p className="mt-3 text-xl font-bold">Kartu tidak dikenali</p>
            <p className="mt-1 text-sm text-slate-600">
              Kode tidak terdaftar atau kartu telah dicabut. Waspadai kemungkinan kartu palsu dan
              laporkan ke BPBD.
            </p>
          </div>
        )}
        {data && (
          <div className="mt-6 text-center">
            {data.valid ? (
              <BadgeCheck className="mx-auto h-16 w-16 text-emerald-600" aria-hidden />
            ) : (
              <ShieldAlert className="mx-auto h-16 w-16 text-amber-600" aria-hidden />
            )}
            <p
              className={`mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-bold ${data.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
            >
              {data.valid ? 'KARTU BERLAKU' : 'MASA BERLAKU HABIS'}
            </p>
            <p className="mt-4 text-2xl font-extrabold tracking-tight">{data.fullName}</p>
            <p className="font-semibold text-sungai-800">{data.positionLabel}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-left text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Kategori</dt>
                <dd className="font-semibold">
                  {data.category === 'relawan' ? 'Relawan kebencanaan' : 'Petugas kebencanaan'}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Wilayah tugas</dt>
                <dd className="font-semibold">{data.dutyKelurahanName ?? '-'}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Nomor kartu</dt>
                <dd className="font-mono text-xs font-semibold">{data.cardNumber}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Berlaku s.d.</dt>
                <dd className="font-semibold">31 Des {data.year}</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs text-slate-500">
              Binaan {data.agencyName}. Halaman ini sengaja tidak menampilkan NIK, foto, atau kontak
              pemegang kartu.
            </p>
          </div>
        )}
      </div>
      <Link to="/" className="mt-6 text-sm text-sungai-100 underline">
        Tentang e-Tangguh
      </Link>
    </main>
  );
}
