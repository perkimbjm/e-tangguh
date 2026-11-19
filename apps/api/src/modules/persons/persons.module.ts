import { Global, Module } from '@nestjs/common';
import { MergeService } from './merge.service';
import { PersonsController } from './persons.controller';
import { PersonsRepository } from './persons.repository';
import { PersonsService } from './persons.service';

@Global()
@Module({
  controllers: [PersonsController],
  providers: [PersonsRepository, PersonsService, MergeService],
  exports: [PersonsService, PersonsRepository],
})
export class PersonsModule {}
