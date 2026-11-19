import { type IdCardSettings } from '@etangguh/shared';
import { type FormEvent } from 'react';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useIdCardSettings, useSaveIdCardSettings } from './api';

const input = 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

/** Pengaturan kartu (admin BPBD): nama instansi, alamat, nomor layanan, penandatangan. */
export function IdCardSettingsForm() {
  const { data } = useIdCardSettings();
  const save = useSaveIdCardSettings();
  const toast = useToast();
  if (!data) return null;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? '').trim() || null;
    save.mutate(
      {
        agencyName: v('agencyName') ?? 'BPBD Kota Banjarmasin',
        address: v('address'),
        hotline: v('hotline'),
        signatoryTitle: v('signatoryTitle'),
        signatoryName: v('signatoryName'),
      } satisfies IdCardSettings,
      {
        onSuccess: () => toast('Pengaturan kartu disimpan', 'sukses'),
        onError: (err) => toast(err instanceof ApiError ? err.message : 'Gagal', 'galat'),
      },
    );
  }
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold">
        Pengaturan kartu (admin BPBD)
      </summary>
      <p className="mt-2 text-xs text-slate-600">
        Isi sesuai data resmi BPBD. Sistem tidak mengarang alamat, nomor layanan, atau nama pejabat;
        bagian kosong tidak dicetak.
      </p>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Nama instansi
          <input name="agencyName" defaultValue={data.agencyName} className={input} />
        </label>
        <label className="text-sm">
          Nomor layanan / Pusdalops
          <input name="hotline" defaultValue={data.hotline ?? ''} className={input} />
        </label>
        <label className="text-sm sm:col-span-2">
          Alamat
          <input name="address" defaultValue={data.address ?? ''} className={input} />
        </label>
        <label className="text-sm">
          Jabatan penandatangan
          <input
            name="signatoryTitle"
            defaultValue={data.signatoryTitle ?? ''}
            placeholder="mis. Kepala Pelaksana BPBD"
            className={input}
          />
        </label>
        <label className="text-sm">
          Nama penandatangan
          <input name="signatoryName" defaultValue={data.signatoryName ?? ''} className={input} />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-lg bg-sungai-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Simpan pengaturan
          </button>
        </div>
      </form>
    </details>
  );
}
