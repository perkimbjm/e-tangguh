import { ADMIN_ROLES } from '@etangguh/shared';
import { toPng } from 'html-to-image';
import {
  ArrowLeft,
  Camera,
  Download,
  Printer,
  RectangleHorizontal,
  RectangleVertical,
  Trash2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { useSession } from '../../../lib/session';
import { CardPreview } from './CardPreview';
import { IdCardBack } from './IdCardBack';
import { IdCardFront } from './IdCardFront';
import { IdCardSettingsForm } from './IdCardSettingsForm';
import type { Orientation } from './geometry';
import { preparePhoto } from './photo';
import { useIdCard, usePhotoMutations, usePhotoUrl } from './api';

const ORIENT_KEY = 'etg:kartu-orientasi';

export function IdCardPage() {
  const { id } = useParams();
  const { year, locked } = useFiscalYear();
  const { user } = useSession();
  const toast = useToast();
  const { data: card, isLoading, error } = useIdCard(year, id);
  const [version, setVersion] = useState(0);
  const photoUrl = usePhotoUrl(year, id, card?.hasPhoto, version);
  const photo = usePhotoMutations(year, id);
  const [orientation, setOrientation] = useState<Orientation>(() => {
    try {
      return localStorage.getItem(ORIENT_KEY) === 'portrait' ? 'portrait' : 'landscape';
    } catch {
      return 'landscape';
    }
  });
  const [qrSvg, setQrSvg] = useState('');
  const front = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!card) return;
    void QRCode.toString(`${window.location.origin}/verifikasi/${card.cardCode}`, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#04222b', light: '#ffffff' },
    }).then(setQrSvg);
  }, [card]);

  const setOrient = (o: Orientation) => {
    setOrientation(o);
    try {
      localStorage.setItem(ORIENT_KEY, o);
    } catch {
      /* abaikan */
    }
  };

  async function onFile(f: File | undefined) {
    if (!f) return;
    try {
      const blob = await preparePhoto(f);
      await photo.upload.mutateAsync(blob);
      setVersion((v) => v + 1);
      toast(`Foto tersimpan (${Math.round(blob.size / 1024)} KB)`, 'sukses');
    } catch (e) {
      toast(
        e instanceof ApiError || e instanceof Error ? e.message : 'Gagal mengunggah foto',
        'galat',
      );
    }
  }

  async function download(which: 'depan' | 'belakang') {
    const node = which === 'depan' ? front.current : back.current;
    if (!node || !card) return;
    setBusy(true);
    try {
      document.documentElement.classList.add('etg-exporting');
      const url = await toPng(node, { pixelRatio: 5 });
      const a = document.createElement('a');
      a.href = url;
      a.download = `kartu-${card.cardNumber}-${which}-${orientation === 'landscape' ? 'lanskap' : 'potret'}.png`;
      a.click();
    } catch (e) {
      console.warn('Ekspor kartu gagal', e);
      toast('Gagal membuat gambar kartu', 'galat');
    } finally {
      document.documentElement.classList.remove('etg-exporting');
      setBusy(false);
    }
  }

  if (!year || !id) return null;
  if (isLoading) return <p role="status">Menyiapkan kartu…</p>;
  if (error || !card)
    return (
      <p role="alert" className="text-red-700">
        {(error as Error)?.message ?? 'Kartu tidak tersedia'}
      </p>
    );
  const faces = { card, orientation, photoUrl, qrSvg };
  const btn =
    'inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50';

  return (
    <div className="space-y-6">
      <Link
        to={`/app/petugas/${id}?ta=${year}`}
        className="inline-flex items-center gap-1.5 text-sm text-sungai-800 hover:underline print:hidden"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Profil petugas
      </Link>
      <div className="print:hidden">
        <PageHeader
          eyebrow={card.category === 'relawan' ? 'Relawan kebencanaan' : 'Petugas kebencanaan'}
          title="Kartu identitas digital"
          description={`${card.fullName} · ${card.cardNumber} · berlaku s.d. 31 Desember ${card.year}. Kartu dapat diverifikasi siapa pun lewat kode QR di sisi belakang.`}
          actions={
            <>
              <div
                className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5"
                role="group"
                aria-label="Orientasi kartu"
              >
                {(['landscape', 'portrait'] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={orientation === o}
                    onClick={() => setOrient(o)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm ${orientation === o ? 'bg-sungai-800 text-white' : 'text-slate-600'}`}
                  >
                    {o === 'landscape' ? (
                      <RectangleHorizontal className="h-4 w-4" aria-hidden />
                    ) : (
                      <RectangleVertical className="h-4 w-4" aria-hidden />
                    )}
                    {o === 'landscape' ? 'Lanskap' : 'Potret'}
                  </button>
                ))}
              </div>
              <button type="button" className={btn} onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden /> Cetak
              </button>
            </>
          }
        />
      </div>

      <div
        className={`grid gap-8 print:hidden ${orientation === 'landscape' ? 'xl:grid-cols-2' : 'sm:grid-cols-2 lg:mx-auto lg:max-w-3xl'}`}
      >
        <CardPreview orientation={orientation} label="Depan">
          <IdCardFront {...faces} seed={11} />
        </CardPreview>
        <CardPreview orientation={orientation} label="Belakang">
          <IdCardBack {...faces} seed={12} />
        </CardPreview>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Pilih foto profil"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className={btn}
          disabled={locked || photo.upload.isPending}
          onClick={() => fileInput.current?.click()}
        >
          <Camera className="h-4 w-4" aria-hidden /> {card.hasPhoto ? 'Ganti foto' : 'Unggah foto'}
        </button>
        {card.hasPhoto && (
          <button
            type="button"
            className={btn}
            disabled={locked || photo.remove.isPending}
            onClick={() =>
              photo.remove.mutate(undefined, { onSuccess: () => setVersion((v) => v + 1) })
            }
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Hapus foto
          </button>
        )}
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() => void download('depan')}
        >
          <Download className="h-4 w-4" aria-hidden /> Unduh depan (PNG)
        </button>
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() => void download('belakang')}
        >
          <Download className="h-4 w-4" aria-hidden /> Unduh belakang (PNG)
        </button>
        <p className="w-full text-xs text-slate-500">
          Foto dipotong 4:5 dan dipadatkan di perangkat Anda (≤ 40 KB) sebelum diunggah. PNG
          diekspor ±450 dpi; cetak pada skala 100% untuk ukuran asli 85,6 × 54 mm.
        </p>
      </div>

      {user && (ADMIN_ROLES as readonly string[]).includes(user.role) && (
        <div className="print:hidden">
          <IdCardSettingsForm />
        </div>
      )}

      {/* Wadah berukuran asli: di layar berada di luar pandangan (untuk ekspor), saat dicetak tampil apa adanya. */}
      <div className="etg-print-area" aria-hidden>
        <div className="etg-print-sheet">
          <div className="etg-print-item">
            <div ref={front}>
              <IdCardFront {...faces} seed={21} />
            </div>
            <span>Depan</span>
          </div>
          <div className="etg-print-item">
            <div ref={back}>
              <IdCardBack {...faces} seed={22} />
            </div>
            <span>Belakang</span>
          </div>
        </div>
        <p className="etg-print-note">
          Kartu {card.cardNumber} · cetak skala 100% · potong mengikuti garis
        </p>
      </div>
      <section className="sr-only" aria-label="Isi kartu dalam teks">
        <p>
          {card.category === 'relawan' ? 'Relawan' : 'Petugas'} kebencanaan binaan{' '}
          {card.settings.agencyName}: {card.fullName}, {card.positionLabel}
          {card.dutyKelurahanName ? `, wilayah tugas ${card.dutyKelurahanName}` : ''}. Nomor{' '}
          {card.cardNumber}, berlaku sampai 31 Desember {card.year}.
        </p>
      </section>
    </div>
  );
}
