import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ROLES, loginRequestSchema, type LoginRequest, type MeResponse } from '@etangguh/shared';
import type { Response } from 'express';
import { loadEnv } from '../../config/env';
import { Audit } from '../audit/audit.decorator';
import { AuditContext } from '../audit/audit-context';
import { Public, Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { clientIp, userAgent, type AppRequest } from '../../common/request';
import { SESSION_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Audit('auth.login', 'users')
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const result = await this.auth.login(body, clientIp(req), userAgent(req));
    req.user = result.user;
    AuditContext.annotate({ entityId: result.user.id });
    res.cookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: loadEnv().NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: result.expiresAt,
    });
    return { user: result.user, csrfToken: result.csrfToken };
  }

  @Roles(...ROLES)
  @Post('logout')
  @HttpCode(204)
  @Audit('auth.logout', 'users')
  async logout(@Req() req: AppRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    if (req.session) await this.auth.logout(req.session.id);
    AuditContext.annotate({ entityId: req.user?.id });
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Roles(...ROLES)
  @Get('me')
  me(@Req() req: AppRequest): MeResponse {
    return { user: req.user!, csrfToken: req.session!.csrfToken };
  }
}
