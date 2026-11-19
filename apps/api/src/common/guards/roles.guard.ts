import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@etangguh/shared';
import { PUBLIC_KEY, ROLES_KEY } from '../decorators/roles.decorator';
import { ApiException } from '../errors/api-exception';
import type { AppRequest } from '../request';

/** Default ditolak: rute tanpa `@Roles` (dan bukan `@Public`) selalu 403. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handlers = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, handlers)) return true;
    const roles = this.reflector.getAllAndOverride<readonly Role[] | undefined>(ROLES_KEY, handlers);
    const user = context.switchToHttp().getRequest<AppRequest>().user;
    if (!roles || roles.length === 0 || !user || !roles.includes(user.role)) {
      throw ApiException.forbidden();
    }
    return true;
  }
}
