import { hazardZoneSchema, type HazardZoneRequest } from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { FormField } from '../../../components/FormField';
import { ApiError } from '../../../lib/api-client';
import { useKelurahan } from '../../../lib/regions';
import { HazardCheckboxes } from '../residents/HazardCheckboxes';

export function HazardZoneForm({
  onSubmit,
  busy,
}: {
  onSubmit(v: HazardZoneRequest): Promise<unknown>;
  busy: boolean;
}) {
  const { data: kelurahan = [] } = useKelurahan();
  const [mask, setMask] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const parsed = hazardZoneSchema.safeParse({
      kelurahanId: f.get('kelurahanId'),
      rw: String(f.get('rw') ?? ''),
      rt: String(f.get('rt') ?? '') || null,
      hazardMask: mask,
      basis: f.get('basis'),
      basisRef: f.get('basisRef'),
    });
    if (!parsed.success)
      return setErrors(
        Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
      );
    try {
      await onSubmit(parsed.data);
      setErrors({});
      setMask(0);
      form.reset();
    } catch (err) {
      setErrors(
        err instanceof ApiError ? { ...err.fields, _: err.message } : { _: 'Gagal menyimpan' },
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4 sm:grid-cols-2"
    >
      {errors._ && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {errors._}
        </p>
      )}
      <label className="text-sm font-medium">
        Kelurahan
        <select
          name="kelurahanId"
          defaultValue=""
          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2"
        >
          <option value="" disabled>
            Pilih
          </option>
          {kelurahan.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="RW" name="rw" inputMode="numeric" error={errors.rw} />
        <FormField
          label="RT (kosong = seluruh RW)"
          name="rt"
          inputMode="numeric"
          error={errors.rt}
        />
      </div>
      <label className="text-sm font-medium">
        Dasar penetapan
        <select
          name="basis"
          defaultValue="krb"
          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2"
        >
          <option value="krb">Kajian Risiko Bencana</option>
          <option value="keputusan_bpbd">Keputusan BPBD</option>
        </select>
      </label>
      <FormField label="Nomor/judul dokumen" name="basisRef" error={errors.basisRef} />
      <div className="sm:col-span-2">
        <HazardCheckboxes value={mask} onChange={setMask} legend="Jenis bencana yang mengancam" />
        {errors.hazardMask && <p className="text-sm text-red-700">{errors.hazardMask}</p>}
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-sungai-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Tambah kawasan rawan
        </button>
      </div>
    </form>
  );
}
