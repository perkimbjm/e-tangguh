import type { ApprovalStatus } from '@etangguh/shared';

export const APPROVAL_LABEL: Record<ApprovalStatus, { text: string; cls: string }> = {
  menunggu: { text: 'Menunggu', cls: 'bg-amber-100 text-amber-900' },
  disetujui: { text: 'Disetujui', cls: 'bg-emerald-100 text-emerald-900' },
  dikembalikan: { text: 'Dikembalikan', cls: 'bg-red-100 text-red-900' },
};

export const AGE_LABEL = { balita: 'Balita', anak: 'Anak', dewasa: 'Dewasa', lansia: 'Lansia' } as const;

/** Status dengan teks, bukan hanya warna (Prinsip IV). */
export function StatusBadge({ status }: { status: ApprovalStatus }) {
  const s = APPROVAL_LABEL[status];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.text}</span>;
}
