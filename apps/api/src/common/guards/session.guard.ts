import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import { SessionRepository } from '../../modules/auth/session.repository';
import { SESSION_COOKIE } from '../../modules/auth/auth.constants';
import { PUBLIC_KEY } from '../decorators/roles.decorator';
import { ApiException } from '../errors/api-exception';
import type { AppRequest } from '../request';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Memastikan sesi sah dan token CSRF cocok untuk metode pengubah data. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlers = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, handlers)) return true;

    const req = context.switchToHttp().getRequest<AppRequest>();
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw ApiException.unauthorized();

    const found = await this.sessions.findActiveByToken(token);
    if (!found) throw ApiException.unauthorized('Sesi berakhir. Silakan masuk kembali');

    if (!SAFE_METHODS.has(req.method)) {
      const header = req.headers['x-csrf-token'];
      if (typeof header !== 'string' || !safeEqual(header, found.session.csrfToken)) {
        throw new ApiException(403, 'CSRF_TIDAK_VALID', 'Token keamanan tidak valid. Muat ulang halaman');
      }
    }
    req.user = found.user;
    req.session = found.session;
    return true;
  }
}
