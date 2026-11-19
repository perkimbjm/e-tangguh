import { Global, Module } from '@nestjs/common';
import { PersonsRepository } from './persons.repository';
import { PersonsService } from './persons.service';

@Global()
@Module({ providers: [PersonsRepository, PersonsService], exports: [PersonsService, PersonsRepository] })
export class PersonsModule {}
