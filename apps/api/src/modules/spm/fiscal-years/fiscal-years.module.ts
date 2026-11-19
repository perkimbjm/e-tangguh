import { Global, Module } from '@nestjs/common';
import { FiscalYearsController } from './fiscal-years.controller';
import { FiscalYearsRepository } from './fiscal-years.repository';
import { FiscalYearsService } from './fiscal-years.service';

@Global()
@Module({
  controllers: [FiscalYearsController],
  providers: [FiscalYearsRepository, FiscalYearsService],
  exports: [FiscalYearsService],
})
export class FiscalYearsModule {}
