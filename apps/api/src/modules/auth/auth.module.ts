import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginRateLimiter } from './login-rate-limiter';
import { SessionRepository } from './session.repository';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionRepository, { provide: LoginRateLimiter, useFactory: () => new LoginRateLimiter() }],
  exports: [SessionRepository],
})
export class AuthModule {}
