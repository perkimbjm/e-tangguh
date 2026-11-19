import type { ReactNode } from 'react';

/** Judul halaman seragam: eyebrow, judul, keterangan, dan aksi di kanan. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sungai-700">
            {eyebrow}
          </p>
        )}
        <h1 id={id} className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
