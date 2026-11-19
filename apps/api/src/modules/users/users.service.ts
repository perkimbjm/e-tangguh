import { Injectable } from '@nestjs/common';
import type { CreateUserRequest, Role, SessionUser } from '@etangguh/shared';
import { asc, eq } from 'drizzle-orm';
import { DbService } from '../../db/db.module';
import { users } from '../../db/schema';
import { ApiException } from '../../common/errors/api-exception';
import { SessionRepository } from '../auth/session.repository';
import { hashPassword } from '../auth/password';
import { RegionsRepository } from '../regions/regions.repository';

const publicColumns = {
  id: users.id,
  email: users.email,
  phone: users.phone,
  role: users.role,
  kelurahanId: users.kelurahanId,
  isActive: users.isActive,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

/** Peran yang hanya boleh dikelola super admin. */
const SUPER_ONLY: ReadonlySet<Role> = new Set(['admin_bpbd', 'super_admin']);

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DbService,
    private readonly regions: RegionsRepository,
    private readonly sessions: SessionRepository,
  ) {}

  private assertCanManage(actor: SessionUser, targetRole: Role): void {
    if (actor.role !== 'super_admin' && SUPER_ONLY.has(targetRole)) {
      throw ApiException.forbidden('Hanya super admin yang dapat mengelola akun admin');
    }
  }

  list() {
    return this.db.executor().select(publicColumns).from(users).orderBy(asc(users.createdAt));
  }

  async create(actor: SessionUser, input: CreateUserRequest) {
    this.assertCanManage(actor, input.role);
    if (input.kelurahanId) {
      const region = await this.regions.findById(input.kelurahanId);
      if (region?.level !== 'kelurahan') throw ApiException.validation({ kelurahanId: 'Kelurahan tidak ditemukan' });
    }
    const [row] = await this.db
      .executor()
      .insert(users)
      .values({
        email: input.email ?? null,
        phone: input.phone ?? null,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        kelurahanId: input.kelurahanId ?? null,
      })
      .returning(publicColumns);
    return row!;
  }

  async setActive(actor: SessionUser, id: string, isActive: boolean) {
    const [target] = await this.db.executor().select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw ApiException.notFound('Akun tidak ditemukan');
    this.assertCanManage(actor, target.role);
    if (target.id === actor.id && !isActive) throw ApiException.validation({ isActive: 'Tidak dapat menonaktifkan akun sendiri' });
    const [row] = await this.db.executor().update(users).set({ isActive }).where(eq(users.id, id)).returning(publicColumns);
    if (!isActive) await this.sessions.deleteForUser(id);
    return row!;
  }
}
