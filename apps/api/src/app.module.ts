import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { SessionGuard } from './common/guards/session.guard';
import { CryptoModule } from './crypto/crypto.module';
import { DbModule } from './db/db.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { RegionsModule } from './modules/regions/regions.module';
import { PersonsModule } from './modules/persons/persons.module';
import { FiscalYearsModule } from './modules/spm/fiscal-years/fiscal-years.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [DbModule, CryptoModule, AuditModule, AuthModule, FilesModule, RegionsModule, UsersModule, PersonsModule, FiscalYearsModule],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    // Urutan penting: sesi dulu, lalu peran (default ditolak).
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
