import { HAZARDS, hasHazard, toMask } from '@etangguh/shared';

interface Props {
  value: number;
  onChange(mask: number): void;
  legend?: string;
  disabled?: boolean;
}

/** Pilihan jenis bencana sebagai kotak centang; nilai disimpan sebagai bitmask. */
export function HazardCheckboxes({ value, onChange, legend = 'Jenis kerawanan', disabled }: Props) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {HAZARDS.map((h) => {
          const checked = value > 0 && hasHazard(value, h.code);
          return (
            <label key={h.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const codes = HAZARDS.filter((x) =>
                    x.code === h.code ? e.target.checked : value > 0 && hasHazard(value, x.code),
                  ).map((x) => x.code);
                  onChange(toMask(codes));
                }}
                className="h-4 w-4 rounded border-slate-400 text-sky-700 focus:ring-sky-700"
              />
              {h.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
