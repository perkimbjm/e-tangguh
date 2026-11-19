import { Injectable } from '@nestjs/common';
import type { LoginRequest, SessionUser } from '@etangguh/shared';
import { eq, or } from 'drizzle-orm';
import { DbService } from '../../db/db.module';
import { users } from '../../db/schema';
import { ApiException } from '../../common/errors/api-exception';
import { LoginRateLimiter } from './login-rate-limiter';
import { verifyDummy, verifyPassword } from './password';
import { SessionRepository } from './session.repository';

export interface LoginResult {
  user: SessionUser;
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly sessions: SessionRepository,
    private readonly limiter: LoginRateLimiter,
  ) {}

  async login(input: LoginRequest, ip: string | null, ua: string | null): Promise<LoginResult> {
    const identifier = input.identifier.trim();
    const key = `${ip ?? '-'}|${identifier.toLowerCase()}`;
    if (this.limiter.isBlocked(key)) throw ApiException.tooManyRequests();

    const [row] = await this.db
      .executor()
      .select()
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.phone, identifier)))
      .limit(1);

    const ok = row ? await verifyPassword(row.passwordHash, input.password) : await verifyDummy(input.password);
    if (!row || !ok || !row.isActive) {
      this.limiter.recordFailure(key);
      throw new ApiException(401, 'KREDENSIAL_SALAH', 'Email/nomor ponsel atau kata sandi salah');
    }
    this.limiter.reset(key);

    const session = await this.sessions.create(row.id, ip, ua);
    await this.db.executor().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.id));
    const user: SessionUser = {
      id: row.id,
      email: row.email,
      phone: row.phone,
      role: row.role,
      kelurahanId: row.kelurahanId,
    };
    return { user, ...session };
  }

  logout(sessionId: string): Promise<void> {
    return this.sessions.delete(sessionId);
  }
}
