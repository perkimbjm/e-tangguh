import { Injectable } from '@nestjs/common';
import type { Role } from '@etangguh/shared';
import { DbService } from '../../db/db.module';
import { auditLog } from '../../db/schema';
import { sanitizeAuditDetail } from './audit-sanitize';

export interface AuditEntry {
  actorUserId: string | null;
  actorRole: Role | null;
  action: string;
  entity: string;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detail?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  /** Menulis entri audit dalam transaksi yang sedang berjalan (bila ada). */
  async record(entry: AuditEntry): Promise<void> {
    await this.db
      .executor()
      .insert(auditLog)
      .values({
        actorUserId: entry.actorUserId,
        actorRole: entry.actorRole,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        detail: entry.detail ? (sanitizeAuditDetail(entry.detail) as Record<string, unknown>) : null,
      });
  }
}
