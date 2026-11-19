import type { SessionUser } from '@etangguh/shared';
import type { Request } from 'express';

export interface RequestSession {
  id: string;
  csrfToken: string;
}

export interface AppRequest extends Request {
  user?: SessionUser;
  session?: RequestSession;
}

export function clientIp(req: Request): string | null {
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

export function userAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return ua ? ua.slice(0, 512) : null;
}
