import { createResidentSchema, type CreateResidentRequest } from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { FormField } from '../../../components/FormField';
import { useToast } from '../../../components/Toast';
import { ApiError, api } from '../../../lib/api-client';
import { useKelurahan } from '../../../lib/regions';
import { useSession } from '../../../lib/session';
import { HazardCheckboxes } from './HazardCheckboxes';
import { useCreateResident } from './api';

const select = 'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2';

export function ResidentForm({ year, onDone }: { year: number; onDone(): void }) {
  const { user } = useSession();
  const toast = useToast();
  const { data: kelurahan = [] } = useKelurahan();
  const create = useCreateResident(year);
  const [noNik, setNoNik] = useState(false);
  const [special, setSpecial] = useState(false);
  const [mask, setMask] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nikNote, setNikNote] = useState<string | null>(null);
  const ownKelurahan = user?.role === 'pendata_kelurahan' ? user.kelurahanId : null;

  async function checkNik(nik: string) {
    setNikNote(null);
    if (!/^\d{16}$/.test(nik.replace(/\D/g, ''))) return;
    const res = await api
      .get<{ items: unknown[] }>(`/spm/${year}/residents?nik=${nik.replace(/\D/g, '')}&limit=1`)
      .catch(() => null);
    setNikNote(
      res && res.items.length > 0
        ? 'NIK ini sudah tercatat pada tahun anggaran ini.'
        : 'Belum tercatat tahun ini. Bila orang sudah ada di modul lain, data dirinya dipakai ulang.',
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => {
      const v = String(f.get(k) ?? '').trim();
      return v === '' ? undefined : v;
    };
    const parsed = createResidentSchema.safeParse({
      fullName: str('fullName'),
      gender: str('gender'),
      birthPlace: str('birthPlace'),
      birthDate: str('birthDate'),
      nik: noNik ? undefined : str('nik'),
      noNikReason: noNik ? str('noNikReason') : undefined,
      kk: str('kk'),
      isFamilyHead: f.get('isFamilyHead') === 'on',
      kelurahanId: ownKelurahan ?? str('kelurahanId'),
      rw: str('rw'),
      rt: str('rt'),
      address: str('address'),
      isPoor: f.get('isPoor') === 'miskin',
      hasSpecialNeeds: special,
      specialNeeds: special ? str('specialNeeds') : undefined,
      hazardMask: mask > 0 ? mask : undefined,
    } satisfies Partial<Record<keyof CreateResidentRequest, unknown>>);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? '_'), i.message])),
      );
      return;
    }
    setErrors({});
    try {
      const res = await create.mutateAsync(parsed.data);
      toast(
        res.approvalStatus === 'menunggu'
          ? 'Tersimpan. Menunggu persetujuan BPBD.'
          : 'Tersimpan dan disetujui.',
        'sukses',
      );
      if (res.duplicateCandidates.length)
        toast(
          `Periksa kemungkinan orang ganda: ${res.duplicateCandidates.map((d) => d.fullName).join(', ')}`,
          'info',
        );
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ ...err.fields, _: err.message });
      }
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {errors._ && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {errors._}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nama lengkap" name="fullName" error={errors.fullName} required />
        <label className="text-sm font-medium text-slate-800">
          Jenis kelamin
          <select name="gender" className={select} defaultValue="">
            <option value="" disabled>
              Pilih
            </option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
          {errors.gender && (
            <span className="mt-1 block text-sm text-red-700">{errors.gender}</span>
          )}
        </label>
        <div>
          <FormField
            label="NIK"
            name="nik"
            inputMode="numeric"
            autoComplete="off"
            disabled={noNik}
            error={errors.nik}
            onBlur={(e) => void checkNik(e.target.value)}
          />
          {nikNote && (
            <p className="mt-1 text-xs text-slate-600" role="status">
              {nikNote}
            </p>
          )}
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={noNik} onChange={(e) => setNoNik(e.target.checked)} />{' '}
            NIK belum ada
          </label>
        </div>
        {noNik ? (
          <FormField label="Alasan NIK belum ada" name="noNikReason" error={errors.noNikReason} />
        ) : (
          <div />
        )}
        <FormField
          label="Nomor KK"
          name="kk"
          inputMode="numeric"
          autoComplete="off"
          error={errors.kk}
        />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="isFamilyHead" /> Kepala keluarga
        </label>
        <FormField label="Tempat lahir" name="birthPlace" error={errors.birthPlace} />
        <FormField label="Tanggal lahir" name="birthDate" type="date" error={errors.birthDate} />
        {!ownKelurahan && (
          <label className="text-sm font-medium text-slate-800">
            Kelurahan
            <select name="kelurahanId" className={select} defaultValue="">
              <option value="" disabled>
                Pilih
              </option>
              {kelurahan.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
            {errors.kelurahanId && (
              <span className="mt-1 block text-sm text-red-700">{errors.kelurahanId}</span>
            )}
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <FormField label="RW" name="rw" inputMode="numeric" error={errors.rw} />
          <FormField label="RT" name="rt" inputMode="numeric" error={errors.rt} />
        </div>
        <FormField label="Alamat" name="address" className="sm:col-span-2" error={errors.address} />
        <label className="text-sm font-medium text-slate-800">
          Kondisi ekonomi
          <select name="isPoor" className={select} defaultValue="tidak">
            <option value="tidak">Tidak miskin</option>
            <option value="miskin">Miskin</option>
          </select>
        </label>
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={special}
              onChange={(e) => setSpecial(e.target.checked)}
            />{' '}
            Berkebutuhan khusus
          </label>
          {special && (
            <FormField
              label="Jenis kebutuhan khusus"
              name="specialNeeds"
              error={errors.specialNeeds}
            />
          )}
        </div>
      </div>
      <HazardCheckboxes
        value={mask}
        onChange={setMask}
        legend="Jenis kerawanan (kosongkan untuk mengikuti kawasan rawan RT/RW)"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-sungai-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {create.isPending ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}
