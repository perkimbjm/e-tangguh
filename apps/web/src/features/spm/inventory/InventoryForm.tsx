import { SUPPORT_KEYS, SUPPORT_LABEL, equipmentSchema, logisticsSchema } from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { FormField } from '../../../components/FormField';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { type InventoryKind, useInventoryMutations } from './api';

export function InventoryForm({ kind, year }: { kind: InventoryKind; year: number }) {
  const { create } = useInventoryMutations(kind, year);
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const n = (k: string) =>
      String(f.get(k) ?? '').trim() === '' ? undefined : Number(String(f.get(k)).replace(',', '.'));
    const s = (k: string) => String(f.get(k) ?? '').trim() || undefined;
    const input: Record<string, unknown> = {
      name: s('name'),
      quantity: n('quantity'),
      unit: s('unit'),
      locationText: s('locationText'),
      institution: s('institution'),
      qtyGood: n('qtyGood') ?? 0,
      qtyBroken: n('qtyBroken') ?? 0,
    };
    if (kind === 'equipment') for (const k of SUPPORT_KEYS) input[k] = f.get(k) === 'on';
    const parsed = (kind === 'equipment' ? equipmentSchema : logisticsSchema).safeParse(input);
    if (!parsed.success)
      return setErrors(
        Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? '_'), i.message])),
      );
    setErrors({});
    try {
      await create.mutateAsync(parsed.data);
      toast('Tersimpan', 'sukses');
      form.reset();
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fields, _: err.message });
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4"
    >
      {errors._ && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-4">
          {errors._}
        </p>
      )}
      <FormField
        label={kind === 'equipment' ? 'Nama peralatan' : 'Nama barang'}
        name="name"
        error={errors.name}
        className="sm:col-span-2"
      />
      <FormField label="Jumlah" name="quantity" inputMode="decimal" error={errors.quantity} />
      <FormField label="Satuan" name="unit" error={errors.unit} />
      <FormField label="Posisi/lokasi" name="locationText" className="sm:col-span-2" />
      <FormField label="Institusi penanggung jawab" name="institution" className="sm:col-span-2" />
      <FormField
        label="Jumlah kondisi baik"
        name="qtyGood"
        inputMode="decimal"
        error={errors.qtyGood}
      />
      <FormField
        label="Jumlah kondisi rusak"
        name="qtyBroken"
        inputMode="decimal"
        error={errors.qtyBroken}
      />
      {kind === 'equipment' && (
        <fieldset className="text-sm sm:col-span-4">
          <legend className="font-medium">Jenis dukungan operasi tanggap darurat</legend>
          {SUPPORT_KEYS.map((k) => (
            <label key={k} className="mr-4 inline-flex items-center gap-1.5">
              <input type="checkbox" name={k} /> {SUPPORT_LABEL[k]}
            </label>
          ))}
        </fieldset>
      )}
      <div className="sm:col-span-4">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-sky-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Tambah
        </button>
      </div>
    </form>
  );
}
