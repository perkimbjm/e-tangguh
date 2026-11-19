import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/** Dialog konfirmasi berbasis `<dialog>` bawaan (fokus terkunci, Esc menutup). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Ya, lanjutkan',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-title"
      className="w-full max-w-md rounded-xl p-0 backdrop:bg-slate-900/50"
    >
      <div className="p-5">
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-2 text-sm text-slate-700">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-3 py-2 text-sm font-semibold text-white ${danger ? 'bg-red-700 hover:bg-red-800' : 'bg-sky-800 hover:bg-sky-900'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
