import { Injectable } from '@nestjs/common';
import type { SessionUser } from '@etangguh/shared';
import { and, eq, gt, lt } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { DbService } from '../../db/db.module';
import { sessions, users } from '../../db/schema';
import type { RequestSession } from '../../common/request';
import { SESSION_TTL_MS } from './auth.constants';

export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

@Injectable()
export class SessionRepository {
  constructor(private readonly db: DbService) {}

  async create(userId: string, ip: string | null, userAgent: string | null) {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.db.executor().insert(sessions).values({
      tokenHash: hashToken(token),
      userId,
      csrfToken,
      expiresAt,
      ip,
      userAgent,
    });
    return { token, csrfToken, expiresAt };
  }

  async findActiveByToken(token: string): Promise<{ user: SessionUser; session: RequestSession } | null> {
    const [row] = await this.db
      .executor()
      .select({
        sessionId: sessions.id,
        csrfToken: sessions.csrfToken,
        id: users.id,
        email: users.email,
        phone: users.phone,
        role: users.role,
        kelurahanId: users.kelurahanId,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(users.isActive, true)))
      .limit(1);
    if (!row) return null;
    const { sessionId, csrfToken, ...user } = row;
    return { user, session: { id: sessionId, csrfToken } };
  }

  async delete(sessionId: string): Promise<void> {
    await this.db.executor().delete(sessions).where(eq(sessions.id, sessionId));
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.db.executor().delete(sessions).where(eq(sessions.userId, userId));
  }

  async purgeExpired(): Promise<void> {
    await this.db.executor().delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }
}
