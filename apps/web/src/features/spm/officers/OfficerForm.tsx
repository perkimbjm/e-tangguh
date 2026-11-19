import {
  EMPLOYMENT_LABEL,
  EMPLOYMENT_STATUSES,
  OFFICER_POSITIONS,
  POSITION_LABEL,
  POSITION_STATUS,
  createOfficerSchema,
  type OfficerPosition,
} from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { FormField } from '../../../components/FormField';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useKelurahan } from '../../../lib/regions';
import { HazardCheckboxes } from '../residents/HazardCheckboxes';
import { useOfficerMutations } from './api';

const select = 'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2';

export function OfficerForm({ year, onDone }: { year: number; onDone(): void }) {
  const { data: kelurahan = [] } = useKelurahan();
  const { create } = useOfficerMutations(year);
  const toast = useToast();
  const [position, setPosition] = useState<OfficerPosition>('babinsa');
  const [noNik, setNoNik] = useState(false);
  const [mask, setMask] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const autoStatus = POSITION_STATUS[position];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? '').trim() || undefined;
    const parsed = createOfficerSchema.safeParse({
      fullName: str('fullName'),
      gender: str('gender'),
      birthPlace: str('birthPlace'),
      birthDate: str('birthDate'),
      nik: noNik ? undefined : str('nik'),
      noNikReason: noNik ? str('noNikReason') : undefined,
      position,
      employmentStatus: autoStatus ?? str('employmentStatus'),
      dutyKelurahanId: str('dutyKelurahanId'),
      certifications: str('certifications'),
      isTrcKlb: f.get('isTrcKlb') === 'on',
      isTrcPdb: f.get('isTrcPdb') === 'on',
      isPpe: f.get('isPpe') === 'on',
      isOps: f.get('isOps') === 'on',
      postType: str('postType'),
      hazardMask: mask > 0 ? mask : undefined,
      note: str('note'),
    });
    if (!parsed.success)
      return setErrors(
        Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? '_'), i.message])),
      );
    setErrors({});
    try {
      const res = await create.mutateAsync(parsed.data);
      toast(
        res.isResident
          ? 'Petugas tersimpan; data diri memakai catatan warga yang sama.'
          : 'Petugas tersimpan.',
        'sukses',
      );
      onDone();
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fields, _: err.message });
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
        <FormField label="Nama lengkap" name="fullName" error={errors.fullName} />
        <label className="text-sm font-medium">
          Jenis kelamin
          <select name="gender" defaultValue="" className={select}>
            <option value="" disabled>
              Pilih
            </option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
          {errors.gender && <span className="block text-sm text-red-700">{errors.gender}</span>}
        </label>
        <div>
          <FormField
            label="NIK (bila sudah tercatat sebagai warga, data dirinya dipakai ulang)"
            name="nik"
            inputMode="numeric"
            autoComplete="off"
            disabled={noNik}
            error={errors.nik}
          />
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
        <FormField label="Tempat lahir" name="birthPlace" />
        <FormField label="Tanggal lahir" name="birthDate" type="date" error={errors.birthDate} />
        <label className="text-sm font-medium">
          Jabatan
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as OfficerPosition)}
            className={select}
          >
            {OFFICER_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {POSITION_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Status kepegawaian
          <select
            key={autoStatus ?? 'bebas'}
            name="employmentStatus"
            disabled={!!autoStatus}
            defaultValue={autoStatus ?? ''}
            className={select}
          >
            {!autoStatus && <option value="">Pilih</option>}
            {EMPLOYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EMPLOYMENT_LABEL[s]}
              </option>
            ))}
          </select>
          <span className="block text-xs text-slate-600">
            {autoStatus ? 'Terisi otomatis dari jabatan.' : 'Wajib untuk jabatan lainnya.'}
          </span>
          {errors.employmentStatus && (
            <span className="block text-sm text-red-700">{errors.employmentStatus}</span>
          )}
        </label>
        <label className="text-sm font-medium">
          Kelurahan wilayah tugas
          <select name="dutyKelurahanId" defaultValue="" className={select}>
            <option value="">—</option>
            {kelurahan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <span className="block text-xs text-slate-600">Dasar hitungan aparatur Form 5.A.4.</span>
          {errors.dutyKelurahanId && (
            <span className="block text-sm text-red-700">{errors.dutyKelurahanId}</span>
          )}
        </label>
        <FormField label="Sertifikasi" name="certifications" />
        <fieldset className="text-sm">
          <legend className="font-medium">Penugasan</legend>
          {[
            ['isTrcPdb', 'TRC PDB'],
            ['isTrcKlb', 'TRC KLB'],
            ['isPpe', 'PPE'],
            ['isOps', 'Petugas operasi'],
          ].map(([n, l]) => (
            <label key={n} className="mr-4 inline-flex items-center gap-1.5">
              <input type="checkbox" name={n} defaultChecked={n === 'isOps'} /> {l}
            </label>
          ))}
        </fieldset>
        <label className="text-sm font-medium">
          Lokasi penugasan
          <select name="postType" defaultValue="" className={select}>
            <option value="">—</option>
            <option value="posko">Posko</option>
            <option value="pos_lapangan">Pos lapangan</option>
          </select>
        </label>
        <FormField label="Keterangan" name="note" className="sm:col-span-2" />
      </div>
      <HazardCheckboxes
        value={mask}
        onChange={setMask}
        legend="Jenis bencana yang ditangani (kosongkan untuk mengikuti kawasan rawan kelurahan tugas)"
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
          Simpan
        </button>
      </div>
    </form>
  );
}
