import type { PhotoFrame } from '@etangguh/shared';
import { Save, Undo2 } from 'lucide-react';

const PRESETS: { label: string; frame: PhotoFrame }[] = [
  { label: 'Separuh badan', frame: { x: 50, y: 22, zoom: 1 } },
  { label: 'Close-up', frame: { x: 50, y: 26, zoom: 1.6 } },
  { label: 'Sangat dekat', frame: { x: 50, y: 30, zoom: 2.1 } },
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between text-slate-700">
        {label} <span className="tabular-nums text-slate-500">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-orange-500"
      />
    </label>
  );
}

/** Mengatur fokus dan perbesaran foto pada kartu; pratinjau langsung, disimpan per tahun. */
export function PhotoFrameEditor({
  value,
  dirty,
  saving,
  disabled,
  onChange,
  onSave,
  onReset,
}: {
  value: PhotoFrame;
  dirty: boolean;
  saving: boolean;
  disabled: boolean;
  onChange: (f: PhotoFrame) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const btn =
    'inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50';
  return (
    <fieldset
      disabled={disabled}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden"
    >
      <legend className="px-1 text-sm font-semibold text-slate-800">Atur foto</legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Gaya foto">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className={btn} onClick={() => onChange(p.frame)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Slider
          label="Perbesar"
          value={value.zoom}
          min={1}
          max={2.5}
          step={0.05}
          format={(v) => `${v.toFixed(2)}×`}
          onChange={(zoom) => onChange({ ...value, zoom })}
        />
        <Slider
          label="Geser kiri–kanan"
          value={value.x}
          min={0}
          max={100}
          step={1}
          format={(v) => `${v}%`}
          onChange={(x) => onChange({ ...value, x })}
        />
        <Slider
          label="Geser atas–bawah"
          value={value.y}
          min={0}
          max={100}
          step={1}
          format={(v) => `${v}%`}
          onChange={(y) => onChange({ ...value, y })}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-600 px-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          disabled={!dirty || saving}
          onClick={onSave}
        >
          <Save className="h-4 w-4" aria-hidden /> Simpan pengaturan foto
        </button>
        <button type="button" className={btn} disabled={!dirty} onClick={onReset}>
          <Undo2 className="h-4 w-4" aria-hidden /> Batalkan
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Disarankan foto kasual yang terang dan tajam, wajah menghadap kamera, tanpa kacamata
        hitam atau masker, agar pemegang kartu tetap dapat dikenali.
      </p>
    </fieldset>
  );
}
