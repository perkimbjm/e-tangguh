import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Observable, from, lastValueFrom } from 'rxjs';
import { DbService } from '../../db/db.module';
import { clientIp, userAgent, type AppRequest } from '../../common/request';
import { AuditContext } from './audit-context';
import { AUDIT_KEY, type AuditMeta } from './audit.decorator';
import { AuditService } from './audit.service';

function entityIdFrom(result: unknown, req: AppRequest): string | null {
  if (result && typeof result === 'object' && 'id' in result) {
    const id = (result as { id: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  const param = req.params?.id;
  return typeof param === 'string' ? param : null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();
    const req = context.switchToHttp().getRequest<AppRequest>();

    return from(
      this.db.transaction(async () => {
        const { result: pending, annotation } = AuditContext.run(() =>
          lastValueFrom(next.handle(), { defaultValue: undefined }),
        );
        const result = await pending;
        await this.audit.record({
          actorUserId: req.user?.id ?? null,
          actorRole: req.user?.role ?? null,
          action: meta.action,
          entity: meta.entity,
          entityId: annotation.entityId !== undefined ? annotation.entityId : entityIdFrom(result, req),
          ip: clientIp(req),
          userAgent: userAgent(req),
          detail: annotation.detail,
        });
        return result;
      }),
    );
  }
}
