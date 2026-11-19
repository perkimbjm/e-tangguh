import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'etg:audit';

export interface AuditMeta {
  action: string;
  entity: string;
}

/**
 * Mencatat tepat satu entri `audit_log` untuk setiap permintaan yang berhasil. Penanganan rute
 * dan penulisan audit berjalan dalam satu transaksi basis data.
 */
export const Audit = (action: string, entity: string) => SetMetadata(AUDIT_KEY, { action, entity } satisfies AuditMeta);
