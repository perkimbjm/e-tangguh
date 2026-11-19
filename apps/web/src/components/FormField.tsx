import { useId, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

/** Bidang isian dengan label, petunjuk, dan pesan galat yang terhubung ke pembaca layar. */
export function FormField({ label, name, error, hint, className, ...rest }: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-slate-600">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errId].filter(Boolean).join(' ') || undefined}
        className={`mt-1 block w-full rounded-md border px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700 ${
          error ? 'border-red-600' : 'border-slate-300'
        }`}
        {...rest}
      />
      {error && (
        <p id={errId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
