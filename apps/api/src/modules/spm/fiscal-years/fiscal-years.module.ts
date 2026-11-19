import { Global, Module } from '@nestjs/common';
import { FiscalYearsRepository } from './fiscal-years.repository';
import { FiscalYearsService } from './fiscal-years.service';

@Global()
@Module({
  providers: [FiscalYearsRepository, FiscalYearsService],
  exports: [FiscalYearsService, FiscalYearsRepository],
})
export class FiscalYearsModule {}
