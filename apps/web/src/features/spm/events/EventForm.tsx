import { HAZARDS, createEventSchema } from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { FormField } from '../../../components/FormField';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useKelurahan } from '../../../lib/regions';
import { useEventMutations, witaToIso } from './api';

const select = 'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2';

export function EventForm({ year, onDone }: { year: number; onDone(id: string): void }) {
  const { data: kelurahan = [] } = useKelurahan();
  const { create } = useEventMutations(year);
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? '').trim();
    const num = (k: string) => (str(k) ? Number(str(k)) : undefined);
    const parsed = createEventSchema.safeParse({
      name: str('name'),
      hazardCode: str('hazardCode'),
      occurredAt: witaToIso(str('occurredAt')),
      reportedAt: witaToIso(str('reportedAt')),
      locationText: str('locationText'),
      kelurahanId: str('kelurahanId') || undefined,
      lon: num('lon'),
      lat: num('lat'),
      emergencyDeclaredAt: str('emergencyDeclaredAt')
        ? witaToIso(str('emergencyDeclaredAt'))
        : undefined,
    });
    if (!parsed.success)
      return setErrors(
        Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? '_'), i.message])),
      );
    try {
      const ev = await create.mutateAsync(parsed.data);
      toast('Kejadian tercatat', 'sukses');
      onDone(ev.id);
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fields, _: err.message });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      {errors._ && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {errors._}
        </p>
      )}
      <FormField label="Nama kejadian" name="name" error={errors.name} className="sm:col-span-2" />
      <label className="text-sm font-medium">
        Jenis bencana
        <select name="hazardCode" defaultValue="banjir" className={select}>
          {HAZARDS.map((h) => (
            <option key={h.code} value={h.code}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Kelurahan
        <select name="kelurahanId" defaultValue="" className={select}>
          <option value="">—</option>
          {kelurahan.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </label>
      <FormField
        label="Waktu kejadian (WITA)"
        name="occurredAt"
        type="datetime-local"
        error={errors.occurredAt}
      />
      <FormField
        label="Waktu laporan diterima (WITA)"
        name="reportedAt"
        type="datetime-local"
        error={errors.reportedAt}
      />
      <FormField
        label="Lokasi"
        name="locationText"
        error={errors.locationText}
        className="sm:col-span-2"
      />
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Bujur (opsional)" name="lon" inputMode="decimal" error={errors.lon} />
        <FormField label="Lintang (opsional)" name="lat" inputMode="decimal" error={errors.lat} />
      </div>
      <FormField
        label="Status darurat ditetapkan (WITA, kosongkan bila tidak)"
        name="emergencyDeclaredAt"
        type="datetime-local"
        error={errors.emergencyDeclaredAt}
      />
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-sky-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Simpan kejadian
        </button>
      </div>
    </form>
  );
}
