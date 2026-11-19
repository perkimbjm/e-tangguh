import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role, SessionUser } from '@etangguh/shared';
import type { AppRequest } from '../request';

export const ROLES_KEY = 'etg:roles';
export const PUBLIC_KEY = 'etg:public';

/** Peran yang boleh memanggil rute. Rute tanpa `@Roles` atau `@Public` ditolak (403). */
export const Roles = (...roles: readonly Role[]) => SetMetadata(ROLES_KEY, roles);

/** Rute tanpa sesi (mis. masuk). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/** Pengguna sesi saat ini; hanya sah di rute ber-`@Roles`. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  const user = ctx.switchToHttp().getRequest<AppRequest>().user;
  if (!user) throw new Error('CurrentUser dipakai pada rute tanpa sesi');
  return user;
});
